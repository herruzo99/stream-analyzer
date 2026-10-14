# moq-testrelay

Independent draft-ietf-moq-transport-22 implementation used for live interop
testing of the browser MoQ client: it answers SETUP, SUBSCRIBE_OK, then sends
one MSF catalog over an OBJECT_DATAGRAM and two objects on a subgroup stream.

## Run

```
go run . -addr :4430        # prints CERT_HASH <sha256 of the certificate>
```

## Certificates

`devcert.pem`/`devkey.pem` are a fixed **self-signed development certificate**
(SANs: 127.0.0.1/localhost). Chromium rejects pinned self-signed certificates
whose validity exceeds ~14 days, so it is deliberately short-lived and must be
regenerated (and the constants in `src/infrastructure/moq/session.js` updated)
when it expires — `tests/heux/moq-devcert-contract.test.mjs` fails loudly when
that time comes. The private key is only useful for impersonating a loopback
relay; the browser client pins the certificate **for loopback URLs only**.

For a stock-Chrome, no-pinning setup, pass a locally trusted CA (e.g. mkcert):

```
go run . -addr :4430 \
  -ca-cert "$(mkcert -CAROOT)/rootCA.pem" \
  -ca-key  "$(mkcert -CAROOT)/rootCA-key.pem"
```
