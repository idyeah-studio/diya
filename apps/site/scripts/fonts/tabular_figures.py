"""Give DIYA Sans tabular figures the same 0 and 1 as its default figures.

Mona Sans draws its tabular 0 with a slash and its tabular 1 with a foot, so
a column of tabular figures looked like code. This copies the default 0 and 1
outlines, with every variation delta, into the glyphs that `tnum` points at,
centered on the tabular advance at every weight and width. The tabular 2-9
already match the defaults. Running it again changes nothing.

build-diya-sans.py applies it while building. To patch the shipped files:
  python3 tabular_figures.py packages/diya/src/fonts/DIYASans.woff2 \\
                             packages/diya/src/fonts/DIYASans-Italic.woff2
"""
import copy
import sys

from fontTools.ttLib import TTFont
from fontTools.ttLib.tables.TupleVariation import TupleVariation
from fontTools.varLib.iup import iup_delta


def _tnum_map(font):
    gsub = font["GSUB"].table
    mapping = {}
    for record in gsub.FeatureList.FeatureRecord:
        if record.FeatureTag != "tnum":
            continue
        for index in record.Feature.LookupListIndex:
            for sub in gsub.LookupList.Lookup[index].SubTable:
                sub = getattr(sub, "ExtSubTable", sub)
                mapping.update(getattr(sub, "mapping", {}) or {})
    return mapping


def _key(variation):
    return tuple(sorted(variation.axes.items()))


def _deltas(font, glyph, variation):
    """Every point's delta, phantom points included, with inferred (IUP) gaps filled."""
    glyf = font["glyf"]
    coords, ends, _ = glyf[glyph].getCoordinates(glyf)
    count = len(coords)
    deltas = list(variation.coordinates)
    if any(delta is None for delta in deltas):
        advance = font["hmtx"][glyph][0]
        points = list(coords) + [(0, 0), (advance, 0), (0, 0), (0, 0)]
        deltas = list(iup_delta(deltas, points, list(ends)))
    return [tuple(delta) for delta in deltas], count


def _advance_delta(deltas, count):
    return deltas[count + 1][0] - deltas[count][0]


def _replace(font, source, target, target_deltas):
    glyf, hmtx, gvar = font["glyf"], font["hmtx"], font["gvar"].variations
    source_advance, source_lsb = hmtx[source]
    target_advance = hmtx[target][0]
    shift = round((target_advance - source_advance) / 2)
    glyph = copy.deepcopy(glyf[source])
    glyph.coordinates.translate((shift, 0))
    glyph.recalcBounds(glyf)
    glyf[target] = glyph
    hmtx[target] = (target_advance, source_lsb + shift)
    rebuilt = []
    for variation in gvar.get(source, []):
        deltas, count = _deltas(font, source, variation)
        own = target_deltas.get(_key(variation))
        if own:
            own_deltas, own_count = own
            dx = (_advance_delta(own_deltas, own_count) - _advance_delta(deltas, count)) / 2
            phantom = [(round(x), round(y)) for x, y in own_deltas[own_count:]]
        else:
            dx, phantom = -_advance_delta(deltas, count) / 2, [(0, 0)] * 4
        points = [(round(x + dx), round(y)) for x, y in deltas[:count]]
        rebuilt.append(TupleVariation(dict(variation.axes), points + phantom))
    gvar[target] = rebuilt


def plain_tabular_figures(font):
    """Point tabular 0 and 1 at the default figures' design, in place."""
    cmap = font.getBestCmap()
    tnum = _tnum_map(font)
    pairs = [(cmap[ord(c)], tnum[cmap[ord(c)]]) for c in "01"]
    # Read the tabular glyphs' own advance deltas before their outlines are replaced.
    saved = {target: {_key(v): _deltas(font, target, v) for v in font["gvar"].variations.get(target, [])}
             for _, target in pairs}
    for source, target in pairs:
        _replace(font, source, target, saved[target])
    return pairs


if __name__ == "__main__":
    for path in sys.argv[1:]:
        font = TTFont(path)
        pairs = plain_tabular_figures(font)
        font.flavor = "woff2"
        font.save(path)
        print(f"{path}: tabular {', '.join(t for _, t in pairs)} now match {', '.join(s for s, _ in pairs)}")
