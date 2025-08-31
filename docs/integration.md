# Application Integration Rules

This document describes how front-end and back-end must be integrated.

## Requests and Responses

### Response Codes

- **200, 201** – Successful operation.
- **400** – Issue with the request.
- **401** – Issue with user authentication.
- **403** – The user is logged in, but does not have access to this resource.
- **404** – Requested data not found.

### Response Body

#### Successful POST, PATCH, and DELETE Requests

```json
{
  "id(userId, documentId, ...)": 1,
  "message": "Operation successful"
}
```

#### Successful GET Requests  
Body contains the requested information:

```json
{
  "documentId": 1,
  "documentName": "teste",
  "documentType": "pdf",
  "documentDescription": "lalalala",
  "documentCreationDate": "2025-08-19T03:19:32.000Z",
  "documentLastModifiedDate": "2025-08-19T03:19:32.000Z",
  "documentActiveVersionId": null,
  "organizationId": 1
}
```

#### Error for Any Request

```json
{
  "message": "Document not found",
  "error": "Not Found",
  "statusCode": 404
}
```
