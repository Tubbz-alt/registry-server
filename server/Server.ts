import * as express from 'express';
import * as path from 'path';
import { Pool, Client } from 'pg';
import { parse as parsePgConnectionString } from 'pg-connection-string';
import { postgraphile } from 'postgraphile';
import * as PgManyToManyPlugin from '@graphile-contrib/pg-many-to-many';
import * as jwks from 'jwks-rsa';
import * as jwt from 'express-jwt';
import * as childProcess from 'child_process';
import * as fileUpload from 'express-fileupload';
import * as xmldom from 'xmldom';
import * as togeojson from '@mapbox/togeojson';
import * as cors from 'cors';
import { release } from 'os';
import * as unzipper from 'unzipper';
//import * as fs from 'fs';
import * as etl from 'etl';
import { Readable } from 'stream';
import * as bodyParser from 'body-parser';
import { UserRequest, UserIncomingMessage } from './types';

const app = express();

app.use(fileUpload());
app.use(cors());
app.use(bodyParser.json());

// app.use('/.storybook/', express.static(path.join(__dirname, '../web/build/storybook')));
// app.get('/.storybook/*', function (req, res) {
//   res.sendFile(path.join(__dirname, '../web/build/storybook', 'index.html'));
// });

// app.use('/', express.static(path.join(__dirname, '../web/build')));
// app.get('/*', function (req, res) {
//   res.sendFile(path.join(__dirname, '../web/build', 'index.html'));
// });

app.use(jwt({
  secret: jwks.expressJwtSecret({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    jwksUri: "https://regen-network-registry.auth0.com/.well-known/jwks.json"
  }),
  credentialsRequired: false,
  audience: 'https://regen-registry-server.herokuapp.com/',
  issuer: "https://regen-network-registry.auth0.com/",
  algorithms: ['RS256']
}));

const pgPool = new Pool(
  parsePgConnectionString(
    process.env.DATABASE_URL || 'postgres://postgres@localhost:5432/xrn'));

// app.post('/api/login', (req: UserRequest, res: express.Response) => {
//   // Create Postgres ROLE for Auth0 user
//   if(req.user && req.user.sub) {
//     const sub = req.user.sub;
//     pgPool.connect((err, client, release) => {
//       if (err) {
//         res.sendStatus(500);
//         console.error('Error acquiring postgres client', err.stack);
//       } else {
//         client.query('SELECT private.create_app_user_if_needed($1)', [sub], (err, qres) => {
//           if (err) {
//             res.sendStatus(500);
//             console.error('Error creating role', err.stack);
//           } else {
//             // create user and associated party if needed
//             client.query('SELECT private.really_create_user_if_needed($1, $2, $3, $4)',
//               [req.body.email, req.body.nickname, req.body.picture, sub],
//               (err, qres) => {
//                 release();
//                 if (err) {
//                   res.sendStatus(500);
//                   console.error('Error creating user', err.stack);
//                 } else {
//                   res.sendStatus(200);
//                 }
//             });
//           }
//         });
//       }
//     });
//   } else {
//     res.sendStatus(200);
//   }
// });

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


const port = process.env.PORT || 5000;

app.listen(port);

console.log("Started server on port " + port);
console.log("Graphiql UI at http://localhost:" + port + "/graphiql");
