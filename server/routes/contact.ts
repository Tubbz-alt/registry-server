import * as express from 'express';
import * as bodyParser from 'body-parser';
import * as Airtable from 'airtable';

const router = express.Router();
const airtable = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY });
const airtableContactBase = airtable.base(process.env.AIRTABLE_CONTACT_BASE);

router.post('/contact', bodyParser.json(), (req, res: express.Response) => {
  const { email, name, orgName, requestType, message } = req.body;
  airtableContactBase(process.env.AIRTABLE_CONTACT_TABLE).create(
    [
      {
        fields: {
          "Full name": name,
          "Email address": email,
          "Organization name": orgName,
          "Type of request": requestType,
          Message: message,
        },
      },
    ],
    function (err, records) {
      if (err) {
        console.error(err);
        res.status(400).send(err);
      }
      res.sendStatus(200);
    }
  );
});

module.exports = router;
