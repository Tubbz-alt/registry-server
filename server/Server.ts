import * as express from 'express';
import * as path from 'path';
import { postgraphile } from 'postgraphile';
import * as PgManyToManyPlugin from '@graphile-contrib/pg-many-to-many';
import * as fileUpload from 'express-fileupload';
import * as cors from 'cors';
import { release } from 'os';
import * as bodyParser from 'body-parser';
import { UserRequest, UserIncomingMessage } from './types';
import getJwt from './middleware/jwt';

const url = require('url');

const { pgPool } = require('./pool');

if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const REGEN_HOSTNAME_PATTERN = /regen\.network$/;
const NETLIFY_DEPLOY_PREVIEW_HOSTNAME_PATTERN = /deploy-preview-\d+--regen-website\.netlify\.app$/;

const corsOptions = (req, callback) => {
  let options;
  if (process.env.NODE_ENV !== 'production') {
    options = { origin: true };
  } else {
    const originURL = req.header('Origin') && url.parse(req.header('Origin'));
    if (originURL && (originURL.hostname.match(REGEN_HOSTNAME_PATTERN) ||
      originURL.hostname.match(NETLIFY_DEPLOY_PREVIEW_HOSTNAME_PATTERN))) {
      options = { origin: true }; // reflect (enable) the requested origin in the CORS response
    } else {
      options = { origin: false }; // disable CORS for this request
    }
  }

  callback(null, options) // callback expects two parameters: error and options
}

const app = express();

app.use(fileUpload());
app.use(cors(corsOptions));

app.use(getJwt(false));

app.post('/api/login', bodyParser.json(), (req: UserRequest, res: express.Response) => {
  // Create Postgres ROLE for Auth0 user
  if(req.user && req.user.sub) {
    const sub = req.user.sub;
    pgPool.connect((err, client, release) => {
      if (err) {
        res.sendStatus(500);
        console.error('Error acquiring postgres client', err.stack);
      } else {
        client.query('SELECT private.create_app_user_if_needed($1)', [sub], (err, qres) => {
          if (err) {
            res.sendStatus(500);
            console.error('Error creating role', err.stack);
          } else {
            // create user and associated party if needed
            client.query('SELECT private.really_create_user_if_needed($1, $2, $3, $4, NULL)',
              [req.body.email, req.body.nickname, req.body.picture, sub],
              (err, qres) => {
                release();
                if (err) {
                  res.sendStatus(500);
                  console.error('Error creating user', err.stack);
                } else {
                  res.sendStatus(200);
                }
            });
          }
        });
      }
    });
  } else {
    res.sendStatus(200);
  }
});

app.use(postgraphile(pgPool, 'public', {
  graphiql: true,
  watchPg: true,
  dynamicJson: true,
  appendPlugins: [PgManyToManyPlugin],
  pgSettings: (req: UserIncomingMessage) => {
    if(req.user && req.user.sub) {
      const { sub, ...user } = req.user;
      const settings = { role: sub };
      // TODO need to deal with keys that aren't strings properly
      // Object.keys(user).map(k =>
      //   settings['jwt.claims.' + k] = user[k]
      // );
      return settings;
    } else return { role: 'app_user' };
   }
}));

app.use(require('./routes/mailerlite'));
app.use(require('./routes/contact'));
app.use(require('./routes/buyers-info'));
app.use(require('./routes/stripe'));

const port = process.env.PORT || 5000;

app.listen(port);

console.log('Started server on port ' + port);
console.log('Graphiql UI at http://localhost:' + port + '/graphiql');
