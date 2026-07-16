# P6.1 Google Drive Integration

## Milestone boundary

P6.1 only implements the following pipeline:

```text
Google Drive
  -> Drive Service
  -> Parser Registry
  -> plain text
  -> Knowledge Object
```

It does not implement AI answers, SOP reasoning, RAG, embeddings, recommendations, UI, or persistence.

## Module responsibilities

### `google-drive-service.js`

- Uses the Google OAuth provider token, never the Supabase JWT, for Drive API calls.
- Gets folder metadata.
- Lists and paginates folder files, including optional nested folders.
- Exports Google Docs as plain text.
- Downloads PDF, DOCX, and XLSX source bytes.
- Sends downloaded content to `KnowledgeEngine`.

### `knowledge-engine.js`

- Owns the source-independent `KnowledgeParserRegistry`.
- Parses text, PDF, DOCX, and XLSX.
- Allows future parsers to be registered without changing Drive Service.
- Produces the standard Knowledge Object.

## Standard Knowledge Object

```json
{
  "id": "Google Drive File ID",
  "title": "Document title",
  "type": "pdf",
  "folder": "Google Drive Folder ID",
  "folderName": "Folder name",
  "modifiedTime": "RFC 3339 timestamp",
  "content": "Plain text",
  "source": "Google Drive",
  "mimeType": "application/pdf",
  "parser": "pdfjs-text-layer",
  "pages": [],
  "sourceReference": {},
  "metadata": {}
}
```

## Console verification

After completing Google re-authorization with Drive read-only permission, run:

```js
await indexGoogleDriveFolder("YOUR_FOLDER_ID", {
  recursive: true,
  debug: true,
  includeContent: true
});
```

The result contains `folder`, `files`, `knowledge`, `skipped`, and `errors`. Full document content is only printed when debug mode is explicitly enabled. Provider tokens are never printed.

## Extension point

Future sources should implement their own source adapter and send `{ document, data, mimeType, name }` to `KnowledgeEngine.ingest()`. Gmail, Calendar, Notion, GitHub, Markdown, HTML, and OCR must not be added to Drive Service.

## Known security boundary

Supabase refreshes its own session token but does not refresh Google provider tokens. P6.1 fails closed with `GOOGLE_DRIVE_REAUTHORIZE_REQUIRED` when the provider token is missing or expired. A future trusted backend may handle provider-token renewal; no Google client secret is exposed in the browser.
