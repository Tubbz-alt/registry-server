import * as AWS from 'aws-sdk';
import * as nodemailer from 'nodemailer';
// @ts-ignore
import mjml2html = require('mjml');
import { template as lodashTemplate } from 'lodash';
import { promises as fsp } from 'fs';
import * as html2text from 'html-to-text';

const { readFile } = fsp;

// create Nodemailer SES transporter
const transporter: nodemailer.Transporter = nodemailer.createTransport({
  SES: new AWS.SES({
    apiVersion: '2010-12-01',
    accessKeyId: process.env.AWS_SES_KEY_ID || '',
    secretAccessKey: process.env.AWS_SES_ACCESS_KEY || '',
    region: process.env.AWS_REGION || 'us-east-1',
  }),
});

export interface SendEmailPayload {
  options: {
    from?: string;
    to: string | string[];
    subject: string;
  };
  template: string;
  variables: {
    [varName: string]: any;
  };
}

export async function sendEmail(payload: SendEmailPayload) {
  const { options: inOptions, template, variables } = payload;
  const options = {
    from: process.env.SES_EMAIL || 'marie@regen.network',
    ...inOptions,
  };
  if (template) {
    const templateFn = await loadTemplate(template);
    const html = await templateFn(variables);
    const html2textableHtml = html.replace(/(<\/?)div/g, '$1p');
    const text = html2text
      .fromString(html2textableHtml, {
        wordwrap: 120,
      })
      .replace(/\n\s+\n/g, '\n\n');
    Object.assign(options, { html, text });
  }
  try {
    const info = await transporter.sendMail(options);
  } catch (e) {
    console.log(e)
  }
}

const templatePromises = {};
function loadTemplate(template: string) {
  if (!templatePromises[template]) {
    templatePromises[template] = (async () => {
      if (!template.match(/^[a-zA-Z0-9_.-]+$/)) {
        throw new Error(`Disallowed template name '${template}'`);
      }
      const templateString = await readFile(
        `${__dirname}/templates/${template}`,
        'utf8'
      );
      const templateFn = lodashTemplate(templateString, {
        escape: /\[\[([\s\S]+?)\]\]/g,
      });
      return (variables: { [varName: string]: any }) => {
        const mjml = templateFn(variables);
        const { html, errors } = mjml2html(mjml);
        if (errors && errors.length) {
          console.error(errors);
        }
        return html;
      };
    })();
  }
  return templatePromises[template];
}
