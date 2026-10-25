# Deployment

## Repositories

| Repository | Branch | Contents | Purpose |
| --- | --- | --- | --- |
| `terfabinda/website_earms` (`origin`) | `main` | Source (`src/`, `public/`, `package.json`) | Vercel builds it automatically |
| `EARMS-AfDIC/earms-main-portal` (`afdic`) | `main` | Built site only (`index.html`, `assets/`, `images/`, `regulators/`, `stitch/`, `earms-config.js`, `.htaccess`) | Apache docroot pulls it |

## Publishing

```bash
npm run publish:earmshub
```

Builds `dist/`, replaces the tree of `afdic/main` with it, commits and pushes.
Source changes still go to `origin/main` as usual; pushing there no longer
touches the earmshub repository.

## Apache server (`/var/www/earms-portal`)

One-time clone:

```bash
cd /var/www
rm -rf earms-portal
git clone --branch main https://github.com/EARMS-AfDIC/earms-main-portal.git earms-portal
chown -R www-data:www-data earms-portal
```

Every update:

```bash
cd /var/www/earms-portal && git pull --ff-only
```

The document root is the repository checkout, so pulling replaces the live
files. `.htaccess` blocks access to `.git`.
