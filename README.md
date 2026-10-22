# ChuckWise

ChuckWise is Chuck Houseworth’s personal magazine. It publishes commentary — essays, short takes, reviews, notes and links, and conversations — as a static site. There is no account system, no analytics, and no newsletter service.

Posts are Markdown files in the `content/` folder. The sample pieces already there are placeholders. Delete them when real writing replaces them. `content/not-a-post.md` and `content/a-draft-that-must-not-publish.md` are examples of files the site will not publish.

## Write a post

Create a new note in Obsidian, or duplicate `content/templates/new-post.md`. The filename becomes the address: `my-essay.md` is published at `/essays/my-essay/`.

Put this at the top of the note. `draft: true` keeps it off the site until you change it to `false`.

```yaml
---
title: "The title, with *optional italics*"
type: essay
date: 2026-10-22
dek: "One or two sentences under the headline."
tags:
  - sample
featured: false
lead: false
draft: true
---
```

`type` is one of: `essay`, `short-take`, `review`, `note`, `conversation`.

Optional fields:

- `dek` — the sentence under the headline
- `tags` — a list, or a single comma-separated line
- `featured: true` — eligible for the rotating slot on the front page
- `lead: true` — the cover story. If several notes say this, the newest one is used
- `pullQuote` — the big red quotation on the front page, used from the lead story
- `coverLine` — the short line on the cover art
- `rating` — a review score from 0 to 5
- `guest` — who a conversation is with
- `sourceUrl` and `sourceTitle` — for a note, the link and the name of the source

Extra fields Obsidian adds (aliases, css classes, and anything else) are ignored. A note with no `title`, `type`, and `date` is ignored too. A bad date is skipped with a warning. The build keeps going.

A few Obsidian habits work in the body:

- `[[Other note]]` and `[[Other note|words to show]]` become links when that note is published. Otherwise the words stay as plain text. Drafts are not published, so a link to a draft stays plain text.
- `![[image.png]]` embeds a file from `content/attachments/`. You can add a caption with `![[image.png|Caption]]`.
- A callout is a quote that starts with `[!note]`, `[!tip]`, `[!warning]`, or the other usual Obsidian kinds.

```markdown
> [!note] A label
> The body of the callout.
```

Mark one story `lead: true` for the top of the front page. Mark a few `featured: true` for the black “In Rotation” band. The band shows one of them for the week and lets a reader open the others.

## Get posts from the vault into content/

`content/` is the folder the site reads. Two ways to fill it:

**Make `content` the vault.** In Obsidian, choose “Open folder as vault” and select this project’s `content` folder. Install the community plugin Obsidian Git. When a piece is ready, commit and push. Cloudflare Pages rebuilds the site.

Tradeoff: this is the fewest steps, and you are writing directly in the folder that publishes. Obsidian Git finds the Git repository at the project root, so look at what you are committing and do not sweep in unrelated files. Anything in `content/` is stored in Git even when the site does not publish it. If the repository is public, do not keep private notes in this folder.

**Keep your existing vault and copy across.** From the project folder, run:

```bash
./scripts/sync-from-vault.sh /path/to/your/vault
```

The script copies only Markdown files that already have a magazine `type`, plus images those files embed. Then you commit and push.

Tradeoff: private notes without that frontmatter stay in the vault, which is safer. The copy is one-way. It will not delete a post you removed from the vault; delete that file in `content/` yourself. Nothing is published until you commit and push.

## Preview on your computer

You need Node.js 22. In the project folder:

```bash
npm install
npm run dev
```

Open the address it prints (usually http://localhost:4321). Leave that running while you edit. Stop it with Ctrl+C.

`npm run build` writes the finished site into `dist/`. `npm run preview` serves that folder.

## Cloudflare Pages

Do this in the Cloudflare dashboard. This repository does not configure DNS and does not deploy itself.

1. Create a Pages project and connect the Git repository.
2. Use these settings:
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Root directory:** the repository root
   - **Node.js version:** 22
3. No environment variables are required.
4. Production branch: `main`, or whichever branch you want the live site to follow.

Every push to that branch rebuilds the site. `wrangler.toml` records the same output directory if you ever use Wrangler locally. Point `chouseworth.com` at the Pages project only when you are ready; that step is DNS, and it is not done from this repo.

The rotating featured piece is chosen by the week. The page also updates that choice in the browser, so it does not depend on a rebuild every Monday.
