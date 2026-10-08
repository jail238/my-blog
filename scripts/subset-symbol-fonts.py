"""Build the small symbol fallback from the official Noto Sans JP font."""

import argparse
from io import BytesIO
from pathlib import Path

from fontTools import subset
from fontTools.merge import Merger
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont


JP_CODEPOINTS = [
    0x0028, 0x0029,
    0x2200, 0x2208, 0x22BF, 0x2642, 0x266D, 0x2934, 0x32F0,
    0xFF65, 0xFF69, 0xFF84, 0xFF9F,
    0x039B, 0x039E, 0x03A6, 0x03A7, 0x03A8, 0x03B1, 0x03B5, 0x03BD,
    0x042F, 0x2161,
]
SYMBOL_CODEPOINTS = [0x272A]
LATIN_CODEPOINTS = [0x01C2, 0x211D]
CJK_CODEPOINTS = [0x867E]


def make_subset(source, codepoints, weight):
    font = TTFont(source)
    assert all(cp in font.getBestCmap() for cp in codepoints)
    if "fvar" in font:
        axes = {axis.axisTag: axis.defaultValue for axis in font["fvar"].axes}
        axes["wght"] = weight
        instantiateVariableFont(font, axes, inplace=True)
    options = subset.Options()
    options.name_IDs = ["*"]
    options.name_languages = ["*"]
    options.name_legacy = True
    subsetter = subset.Subsetter(options=options)
    subsetter.populate(unicodes=codepoints)
    subsetter.subset(font)
    # Horizontal text needs neither source variation baselines nor math layout.
    for table in ["BASE", "MATH", "STAT", "vhea", "vmtx"]:
        if table in font:
            del font[table]
    return font


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("--symbols", type=Path, required=True)
    parser.add_argument("--latin", type=Path, required=True)
    parser.add_argument("--apl", type=Path, required=True)
    parser.add_argument("--armenian", type=Path, required=True)
    parser.add_argument("--cjk-regular", type=Path, required=True)
    parser.add_argument("--cjk-bold", type=Path, required=True)
    args = parser.parse_args()
    output = Path(__file__).resolve().parents[1] / "src" / "assets" / "fonts"
    for weight, style in [(400, "Regular"), (700, "Bold")]:
        sources = [
            (args.source, JP_CODEPOINTS),
            (args.symbols, SYMBOL_CODEPOINTS),
            (args.latin, LATIN_CODEPOINTS),
            (args.apl, [0x237A]),
            (args.armenian, [0x0578]),
            (args.cjk_regular if weight == 400 else args.cjk_bold, CJK_CODEPOINTS),
        ]
        fonts = []
        for source, points in sources:
            buffer = BytesIO()
            make_subset(source, points, weight).save(buffer)
            fonts.append(buffer)
        # Each source owns disjoint codepoints; retain one small fallback face.
        font = Merger().merge(fonts)
        # Keep copyright/license records, but rename the modified typeface.
        names = {
            1: "Archive Symbols", 2: style, 3: f"Archive Symbols {style}",
            4: f"Archive Symbols {style}", 6: f"ArchiveSymbols-{style}",
            16: "Archive Symbols", 17: style,
        }
        for record in font["name"].names:
            if record.nameID in names:
                record.string = names[record.nameID].encode(record.getEncoding())
        font.flavor = "woff2"
        path = output / f"archive-symbols-{style.lower()}.woff2"
        font.save(path)
        print(f"{path.name}: {path.stat().st_size} bytes")


if __name__ == "__main__":
    main()
