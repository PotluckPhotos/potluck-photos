# potluck-photos

Potluck is a FOSS photo sharing platform. Create an album, invite people to it, everyone uploads photos and captions, then export the album as a print-ready book.

Fully self-hostable — storage is pluggable (Cloudflare R2, S3, or local disk), so running your own instance costs nothing beyond a domain.

## Stack

- [Next.js](https://nextjs.org) (App Router, TypeScript, Tailwind)
- [Supabase](https://supabase.com) for auth and the database
- [Cloudflare R2](https://developers.cloudflare.com/r2/) (or any S3-compatible storage) for photos

## Getting started

```bash
npm install
cp .env.local.example .env.local  # fill in your Supabase and storage keys
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## License

[AGPL-3.0](./LICENSE) — if you modify this and run it as a network service, your changes need to stay open too.
