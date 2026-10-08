"""Build the small symbol fallback from the official Noto Sans JP font."""

import argparse
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont


CODEPOINTS = [
    0x0028, 0x0029,
    0x2200, 0x2208, 0x22BF, 0x2642, 0x266D, 0x2934, 0x32F0,
    0xFF65, 0xFF69, 0xFF84, 0xFF9F,
]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    args = parser.parse_args()
    output = Path(__file__).resolve().parents[1] / "src" / "assets" / "fonts"
    for weight, style in [(400, "Regular"), (700, "Bold")]:
        font = TTFont(args.source)
        assert all(cp in font.getBestCmap() for cp in CODEPOINTS)
        options = subset.Options()
        options.name_IDs = ["*"]
        options.name_languages = ["*"]
        options.name_legacy = True
        subsetter = subset.Subsetter(options=options)
        subsetter.populate(unicodes=CODEPOINTS)
        subsetter.subset(font)
        instantiateVariableFont(font, {"wght": weight}, inplace=True)
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
