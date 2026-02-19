# /// script
# dependencies = [
#   "markdown",
#   "jinja2",
#   "python-frontmatter",
#   "markdown-callouts",
#   "python-slugify",
# ]
# ///

import shutil
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Set

import frontmatter
import markdown
from jinja2 import Environment, FileSystemLoader
from slugify import slugify

# ==================== CONFIGURATION ====================
SOURCE_DIR = Path(__file__).parent / "stories"
OUTPUT_DIR = Path(__file__).parent / "docs"
TEMPLATES_DIR = Path(__file__).parent / "templates"
STATIC_DIR = Path(__file__).parent / "static"

SITE_URL = "https://ghost-3.github.io/GhostlyLib"
INDEX_DESC = (
    "Добро пожаловать в Призрачную библиотеку — литературный архив рассказов Ghost."
)

SITE_TITLE = "Призрачная Библиотека"
DEFAULT_AUTHOR = "Ghost"
DATE_FORMAT = "%Y-%m-%d"
WORDS_PER_MINUTE = 180
MD_EXTENSIONS = ["extra", "nl2br", "smarty", "markdown_callouts", "footnotes"]
# =======================================================


class ContentProcessor:
    @staticmethod
    def create_description(meta: Dict[str, Any]) -> str:
        """Создает описание"""
        author = meta.get("author", DEFAULT_AUTHOR)
        reading_time = meta.get("reading_time", 0)
        date = meta.get("date")
        return f"👤 {author} • 📅 {date} • ⏱️ {reading_time} мин. чтения."

    @staticmethod
    def calculate_reading_time(text: str) -> int:
        words = len(text.split())
        return max(1, round(words / WORDS_PER_MINUTE))

    @staticmethod
    def parse_md(path: Path) -> Dict[str, Any]:
        post = frontmatter.loads(path.read_text(encoding="utf-8"))
        content_html = markdown.markdown(post.content, extensions=MD_EXTENSIONS)

        meta = post.metadata

        if not meta.get("date"):
            meta["date"] = datetime.fromtimestamp(path.stat().st_mtime).strftime(
                DATE_FORMAT
            )
        elif isinstance(meta["date"], datetime):
            meta["date"] = meta["date"].strftime(DATE_FORMAT)
        else:
            meta["date"] = str(meta["date"])

        meta["title"] = meta.get("title", path.stem)
        meta["author"] = meta.get("author", DEFAULT_AUTHOR)

        tags = meta.get("tags", [])
        if isinstance(tags, str):
            tags = [t.strip() for t in tags.split(",") if t.strip()]
        meta["tags"] = tags

        meta["reading_time"] = ContentProcessor.calculate_reading_time(post.content)
        meta["html"] = content_html

        return meta


class SiteBuilder:
    def __init__(self):
        self.env = Environment(loader=FileSystemLoader(str(TEMPLATES_DIR)))
        self.env.globals["SITE_URL"] = SITE_URL
        self.stories: List[Dict[str, Any]] = []
        self.all_tags: Set[str] = set()

    def prepare_output(self):
        if OUTPUT_DIR.exists():
            for item in OUTPUT_DIR.iterdir():
                if item.name == ".git":
                    continue
                if item.is_file():
                    item.unlink()
                else:
                    shutil.rmtree(item)
        else:
            OUTPUT_DIR.mkdir(parents=True)

        if STATIC_DIR.exists():
            shutil.copytree(STATIC_DIR, OUTPUT_DIR / "static", dirs_exist_ok=True)

    def render_to_file(self, template_name: str, context: dict, filename: str):
        template = self.env.get_template(template_name)
        (OUTPUT_DIR / filename).write_text(template.render(**context), encoding="utf-8")

    def process_file(self, path: Path):
        meta = ContentProcessor.parse_md(path)

        slug = f"{slugify(meta['title'])}.html"
        description = ContentProcessor.create_description(meta)

        self.render_to_file(
            "base.html",
            {
                **meta,
                "description": description,
                "current_url": f"{SITE_URL}/{slug}",
            },
            slug,
        )

        self.stories.append({**meta, "url": slug, "is_series": False})
        self.all_tags.update(meta["tags"])

    def process_directory(self, folder: Path):
        md_files = sorted(folder.glob("*.md"))
        if not md_files:
            return

        parts_meta = [ContentProcessor.parse_md(f) for f in md_files]
        first = parts_meta[0]
        series_title = first.get("story_name", folder.name)
        series_author = first.get("author", DEFAULT_AUTHOR)
        series_date = first.get("date")
        series_slug = slugify(series_title)

        parts_links = []
        series_tags = set()
        total_time = 0

        for i, meta in enumerate(parts_meta):
            meta["story_name"] = meta.get("story_name", series_title)
            meta["author"] = meta.get("author", series_author)

            filename = f"{series_slug}-{slugify(meta['title'])}.html"
            parts_links.append({"title": meta["title"], "url": filename})

            total_time += meta["reading_time"]
            series_tags.update(meta.get("tags", []))

        for i, meta in enumerate(parts_meta):
            current_url = parts_links[i]["url"]

            next_part = None
            if i < len(parts_meta) - 1:
                next_part = parts_links[i + 1]

            description = ContentProcessor.create_description(meta)

            self.render_to_file(
                "base.html",
                {
                    **meta,
                    "title": f"{series_title} — {meta['title']}",
                    "description": description,
                    "current_url": f"{SITE_URL}/{current_url}",
                    "next_part": next_part,
                },
                current_url,
            )

        self.stories.append(
            {
                "title": series_title,
                "author": series_author,
                "date": series_date,
                "url": parts_links[0]["url"],
                "tags": sorted(list(series_tags)),
                "reading_time": total_time,
                "is_series": True,
                "parts": parts_links,
            }
        )
        self.all_tags.update(series_tags)

    def build(self):
        self.prepare_output()
        for item in sorted(SOURCE_DIR.iterdir()):
            if item.is_file() and item.suffix == ".md":
                self.process_file(item)
            elif item.is_dir():
                self.process_directory(item)

        self.stories.sort(key=lambda x: x["date"], reverse=True)
        self.render_to_file(
            "index.html",
            {
                "stories": self.stories,
                "all_tags": sorted(list(self.all_tags)),
                "title": SITE_TITLE,
                "description": INDEX_DESC,
                "current_url": SITE_URL,
            },
            "index.html",
        )


if __name__ == "__main__":
    SiteBuilder().build()
