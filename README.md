# codepilgrimage-blog

Personal blog for codepilgrimage. Built with [Quartz v4](https://quartz.jzhao.xyz/).

## Setup & Running Locally

1. Install dependencies: `npm install`
2. Start the local development server: `npx quartz build --serve`
3. The server will start locally, usually at `http://localhost:8080`.

## Adding New Content and Execution Steps

1. Create a new markdown file in the `content` directory (e.g., `content/my-new-post.md`).
2. Add YAML frontmatter to the top of your markdown file, like this:
   ```yaml
   ---
   title: My New Post
   date: 2026-03-05
   tags: ["electronics", "embedded"]
   ---
   ```
3. Write your content below the frontmatter.
4. **Execution**: If the development server (`npx quartz build --serve`) is already running, Quartz will automatically detect the new file, rebuild the site, and live-reload your browser.
5. If the server is not running, execute `npx quartz build --serve` to preview your changes.

When you are ready to publish, build the static site with:
```bash
npx quartz build
```
