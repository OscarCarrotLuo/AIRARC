# AIRARC

A minimal React + Three.js studio for lanyard badges, postcards and button pins. Drag to move or rotate, click to flip, and upload your own artwork. Blue `#4d85c5` and white.

## Run locally

Node.js 22+ and pnpm 11.25.0:

```sh
pnpm install --frozen-lockfile
pnpm dev
```

```sh
pnpm test
pnpm build
pnpm preview
```

## GitHub Pages

Publish this repository as `AIRARC` with the `main` branch. In **Settings → Pages → Build and deployment**, choose **GitHub Actions**. Run **Actions → Deploy AIRARC to GitHub Pages → Run workflow** after enabling Pages. Subsequent pushes to `main` build and deploy automatically.

The workflow sets the correct repository base path. Images, logo, fonts, downloads and saved built-in artwork support project subdirectories. To test the same build locally:

```sh
pnpm build --base /AIRARC/
pnpm preview --base /AIRARC/
```

Deployment reference: [Vite GitHub Pages guide](https://vite.dev/guide/static-deploy.html#github-pages).

## Templates

- [Badge and lanyard](public/templates/badge-templates.zip): 54 × 85.6 mm badge, 20 × 900 mm unfolded lanyard.
- [A6 postcard](public/templates/postcard-templates.zip): 148 × 105 mm.
- [Button pin](public/templates/pin-templates.zip): 58 mm face, supplier-specific 70 mm cut.

Each ZIP includes native Illustrator artwork and export instructions. Upload clean finished-size PNG, JPEG, WebP or SVG files. AI files must be exported first.

## Storage

Artwork and collections stay in this browser's IndexedDB. There is no upload server, account system or cross-device sync. A new domain starts with a separate collection; preserve your original images. WebGL2 and hardware acceleration provide the 3D view.

## Credits

AIRARC branding and print artwork were created for this project. Lanyard physics and ribbon rendering adapt [React Bits](https://github.com/DavidHDev/react-bits). Retained third-party terms are in [licenses](licenses); Space Grotesk and Noto Sans SC include their SIL Open Font Licenses. The original project artwork and the third-party components retain their respective rights.
