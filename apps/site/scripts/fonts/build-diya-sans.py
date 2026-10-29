"""Build DIYA Sans from Mona Sans (SIL Open Font License 1.1).

Mona Sans reserves the font name "Mona", so a modified version must carry a
different name. DIYA Sans keeps the OFL, keeps the original copyright, and
adds IDYeah Studio's modification notice.

What changes from Mona Sans:
  - Renamed to DIYA Sans everywhere a font name is stored.
  - Weight (200-900) and width (75-125) stay exactly as Mona Sans ships
    them. Narrowing the axes re-rounds every outline delta and shifts
    letters by fractions of a pixel, so DIYA Sans keeps the full range and
    renders identically to Mona Sans.
  - DIYA's signature letters are the default: lowercase l with tail
    (ss03), double-storey a (ss05), double-storey g (ss06) and round G
    (ss07). Characters map straight to those shapes, and the stylistic-set
    rules also run inside the always-on ccmp feature, so accented and
    derived forms follow. Every other letter is Mona Sans's own.
  - Tabular figures share the default figures' 0 and 1 (no slash, no
    foot), so columns of numbers line up without looking like code
    (tabular_figures.py).
  - Character set limited to Latin, Latin-1, Latin Extended-A, common
    punctuation, currency (including the rupee sign), arrows and a few
    symbols. All OpenType features are kept (kerning, tabular figures,
    stylistic sets).
  - Shipped as WOFF2.

Sources (checksums below pin the exact files):
  https://raw.githubusercontent.com/google/fonts/main/ofl/monasans/MonaSans%5Bwdth,wght%5D.ttf
  https://raw.githubusercontent.com/google/fonts/main/ofl/monasans/MonaSans-Italic%5Bwdth,wght%5D.ttf
  https://raw.githubusercontent.com/google/fonts/main/ofl/monasans/OFL.txt
Save the two fonts as MonaSans-wdth-wght.ttf and MonaSans-Italic-wdth-wght.ttf.

Usage (needs fontTools and brotli):
  python3 build-diya-sans.py <src-dir> packages/diya/src/fonts
"""
import hashlib
import io
import sys
from pathlib import Path

from fontTools.subset import Options, Subsetter
from fontTools.ttLib import TTFont

from tabular_figures import plain_tabular_figures

SOURCES = {
    "MonaSans-wdth-wght.ttf": ("DIYASans.woff2", "Regular", False,
        "fd6e79634b5ae804a45aac7e2e3c2a325b41291fba59034f4732b0135b8475b3"),
    "MonaSans-Italic-wdth-wght.ttf": ("DIYASans-Italic.woff2", "Italic", True,
        "31e7df54477a3cd46677356ada1d2806bcb4c0dbe3b32987783a74a139d8d064"),
}
UNICODES = [
    *range(0x0020, 0x007F),   # Basic Latin
    *range(0x00A0, 0x0100),   # Latin-1 Supplement
    *range(0x0100, 0x0180),   # Latin Extended-A
    0x0131, 0x0152, 0x0153, 0x02C6, 0x02DA, 0x02DC, 0x0304, 0x0308,
    *range(0x2000, 0x2070),   # General punctuation
    *range(0x20A0, 0x20C1),   # Currency, including U+20B9 rupee
    0x2113, 0x2116, 0x2122, 0x2126, 0x212E,
    *range(0x2190, 0x21A0),   # Arrows
    0x2202, 0x2206, 0x220F, 0x2211, 0x2212, 0x2215, 0x2219, 0x221A,
    0x221E, 0x222B, 0x2248, 0x2260, 0x2264, 0x2265, 0x25CA, 0x2713,
    0xFEFF, 0xFFFD,
]
COPYRIGHT = (
    "Copyright 2022 The Mona Sans Project Authors "
    "(https://github.com/github/mona-sans), with Reserved Font Name \"Mona\". "
    "DIYA Sans is a modified version. Modifications copyright 2026 IDYeah Studio."
)
# Mona Sans stylistic sets that DIYA Sans turns on by default.
SIGNATURE = ("ss03", "ss05", "ss06", "ss07")
# Name records that may still mention the original, as provenance only.
PROVENANCE_IDS = {0, 9, 10}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def rename(font: TTFont, style: str, italic: bool) -> None:
    name = font["name"]
    ps_style = "Italic" if italic else "Regular"
    fixed = {
        0: COPYRIGHT,
        1: "DIYA Sans",
        2: style,
        3: f"1.000;IDYH;DIYASans-{ps_style}",
        4: f"DIYA Sans {style}" if italic else "DIYA Sans Regular",
        5: "Version 1.000; " + " ".join(SIGNATURE) + " on by default",
        6: f"DIYASans-{ps_style}",
        8: "IDYeah Studio",
        9: "Deni Anggara (Mona Sans); modifications IDYeah Studio",
        10: "DIYA Sans is the typeface of the DIYA component library, "
            "a modified version of Mona Sans under the SIL Open Font License.",
        11: "https://diya13.ai",
        16: "DIYA Sans",
        17: style,
        25: "DIYASans" + ("Italic" if italic else ""),
    }
    for record in list(name.names):
        if record.nameID in fixed:
            name.removeNames(nameID=record.nameID)
    for name_id, value in fixed.items():
        name.setName(value, name_id, 3, 1, 0x409)
    # Every remaining record (instance names, STAT labels) loses the old name.
    for record in name.names:
        text = record.toUnicode()
        if "Mona" in text and record.nameID not in PROVENANCE_IDS:
            record.string = text.replace("Mona Sans", "DIYA Sans").replace("MonaSans", "DIYASans")
    for instance in font["fvar"].instances:
        if instance.postscriptNameID != 0xFFFF:
            sub = name.getDebugName(instance.subfamilyNameID).replace(" ", "")
            instance.postscriptNameID = name.addName(f"DIYASans-{sub}")
    font["OS/2"].achVendID = "IDYH"
    leftover = [r.nameID for r in name.names
                if "Mona" in r.toUnicode() and r.nameID not in PROVENANCE_IDS]
    if leftover:
        raise SystemExit(f"Reserved name still present in name IDs {leftover}")


def freeze_signature(font: TTFont) -> None:
    """Make the signature stylistic sets the font's default letters."""
    gsub = font["GSUB"].table
    lookups, mapping = set(), {}
    for record in gsub.FeatureList.FeatureRecord:
        if record.FeatureTag in SIGNATURE:
            lookups.update(record.Feature.LookupListIndex)
    if not lookups:
        raise SystemExit("Signature stylistic sets not found")
    for index in sorted(lookups):
        lookup = gsub.LookupList.Lookup[index]
        for sub in lookup.SubTable:
            sub = getattr(sub, "ExtSubTable", sub)
            if not hasattr(sub, "mapping"):
                raise SystemExit(f"Lookup {index} is not a single substitution")
            mapping.update(sub.mapping)
    for table in font["cmap"].tables:
        if table.isUnicode():
            table.cmap = {code: mapping.get(glyph, glyph) for code, glyph in table.cmap.items()}
    ccmp = [r for r in gsub.FeatureList.FeatureRecord if r.FeatureTag == "ccmp"]
    if not ccmp:
        raise SystemExit("No ccmp feature to carry the signature")
    for record in ccmp:
        merged = sorted(set(record.Feature.LookupListIndex) | lookups)
        record.Feature.LookupListIndex = merged
        record.Feature.LookupCount = len(merged)


def build(src_dir: Path, out_dir: Path) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    for source, (target, style, italic, digest) in SOURCES.items():
        path = src_dir / source
        if sha256(path) != digest:
            raise SystemExit(f"{source}: unexpected source checksum")
        font = TTFont(path)
        rename(font, style, italic)
        freeze_signature(font)
        plain_tabular_figures(font)
        # Round-trip so the subsetter reads fully rebuilt tables.
        buffer = io.BytesIO()
        font.save(buffer)
        buffer.seek(0)
        font = TTFont(buffer)
        options = Options()
        options.layout_features = ["*"]
        options.name_IDs = ["*"]
        options.name_languages = ["*"]
        options.notdef_outline = True
        options.flavor = "woff2"
        subsetter = Subsetter(options=options)
        subsetter.populate(unicodes=UNICODES)
        subsetter.subset(font)
        font.flavor = "woff2"
        font.save(out_dir / target)
        print(f"{target}: {(out_dir / target).stat().st_size // 1024} KB")
    ofl = (src_dir / "OFL.txt").read_text(encoding="utf-8-sig")
    first, rest = ofl.split("\n", 1)
    (out_dir / "OFL.txt").write_text(
        first + "\nCopyright 2026 IDYeah Studio (https://diya13.ai), for the modifications in DIYA Sans.\n" + rest,
        encoding="utf-8")


if __name__ == "__main__":
    build(Path(sys.argv[1]), Path(sys.argv[2]))
