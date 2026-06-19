GET    /v1/health

POST   /v1/dev/bootstrap // desativado em produção

POST   /v1/providers
GET    /v1/providers
PATCH  /v1/providers/:id/activate
PATCH  /v1/providers/:id/deactivate

POST   /v1/templates
GET    /v1/templates
GET    /v1/templates/:id
PATCH  /v1/templates/:id
DELETE /v1/templates/:id

POST   /v1/emails/send
POST   /v1/emails/send-template
POST   /v1/emails/bulk

GET    /v1/email-jobs/:id

GET    /v1/campaigns/:id // ver status da campanha

POST   /v1/two-factor/send
POST   /v1/two-factor/verify