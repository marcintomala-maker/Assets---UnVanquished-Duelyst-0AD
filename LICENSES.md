# Can I use it? License notes for 0 A.D. and Unvanquished art

Checked on 15 Nov 2026 against each project's own license files. This is a helper, not legal advice.

## Quick answer

| Color in the app | Meaning | What you must do |
|---|---|---|
| ✅ **Free** | Public domain, CC0, WTFPL | Nothing. |
| ✅ **Give credit** | CC BY, MIT, Apache, font licenses | Put the author's name + license in your credits. You may sell your game. |
| 🟡 **Give credit + share** | CC BY-SA, GPL, ODbL | Credit the author. If you **change the file**, share your changed file under the same license. You may sell your game. Your own code and your own art stay yours. |
| ⛔ **Can't sell** (red) | Non-commercial licenses | Only for free projects. |
| ❓ **Not sure** (orange) | Nobody wrote down a license | Don't use it until the author says yes. |

## Totals (19,533 files)

| | ✅ Free | ✅ Credit | 🟡 Credit + share | ⛔ Can't sell | ❓ Not sure |
|---|---|---|---|---|---|
| 0 A.D. | 11 | 12 | 15,779 | 0 | 0 |
| Unvanquished | 123 | 798 | 2,725 | 49 | 36 |

Every 0 A.D. file can be used. Only 85 Unvanquished files are a problem. They are all listed below.

---

## 0 A.D. (Release 28, tag `v0.28.0`)

Source: <https://gitea.wildfiregames.com/0ad/0ad> (`LICENSE.md` plus the `LICENSE.txt` in each folder).

| Files | License | Credit |
|---|---|---|
| `binaries/data/mods/*/art/**` (textures, 3D models, animations, UI art, portraits) | CC BY-SA 3.0 | "Wildfire Games", link to <https://www.wildfiregames.com/> and to the license |
| `binaries/data/mods/*/audio/**` (sounds + music) | CC BY-SA 3.0 | same as above |
| `maps/random/*.png` height maps | Public domain (NASA Blue Marble), except `elephantine.png` = OpenStreetMap data (ODbL) | NASA Earth Observatory / OpenStreetMap contributors |
| `maps/scenarios`, `skirmishes`, `tutorials` (`.pmp` + `.xml`) | GPL 2 or later | Wildfire Games |
| `mod/fonts/*` | DejaVu = Bitstream Vera license, FreeFont = GPL 3 + font exception, Linux Biolinum = GPL + font exception / OFL, Source Han Sans = OFL 1.1 | font authors (better to download fonts from their own sites) |

Notes:
- Some textures come from CGTextures photos. CGTextures gave special permission to share them as CC BY-SA.
- The app's previews load from the last GitHub copy of 0 A.D. (Aug 2024). Files added after that have no preview. The **Download** button always takes the R28 version.

**Credit line 0 A.D. asks for:**
> Art/sound from 0 A.D. by Wildfire Games – https://www.wildfiregames.com/ – licensed CC BY-SA 3.0 (https://creativecommons.org/licenses/by-sa/3.0/)

---

## Unvanquished

Sources: <https://github.com/UnvanquishedAssets> (29 asset packages) and `pkg/unvanquished_src.dpkdir` in <https://github.com/Unvanquished/Unvanquished>.
Rules come from each package's `README.md`, `about/*.txt`, `license.txt`, the per-sound `.vorbiscomment` files, the game's `COPYING.txt`, and the official wiki table at <https://wiki.unvanquished.net/wiki/Credits/Media>.

Default for anything not otherwise listed: **CC BY-SA 2.5** (Unvanquished's media license).

| Package | License |
|---|---|
| tex-common | CC0 |
| tex-pk01, tex-pk02 | CC BY 3.0 (Philip "Blazeeer" Klevestav) |
| tex-trak5 | MIT (TRaK) |
| tex-ex, tex-exm | CC BY-SA 4.0 (evillair) |
| tex-ej01, tex-tech | CC BY-SA 3.0 |
| tex-space, tex-vega | CC BY-SA 3.0 or GPL 2 (you pick) |
| map-parpax | CC BY-SA 4.0 |
| other maps | CC BY-SA 3.0 (with the exceptions below) |
| res-players / res-weapons / res-buildables | CC BY-SA 2.5, 3.0 or 4.0 per model (see the app, or the wiki table) |
| sounds with a `.vorbiscomment` file | the license in that file (often CC0 or CC BY) |

### ⛔ Can't sell (49 files)

- `map-perseus/textures/perseus_q4power_src/*` and `map-yocto/textures/yocto_q4power_src/*` (48 files): Powerplant textures by Lunaran. His terms say **no commercial use**.
- `map-chasm/sound/chasm/ambient.flac`: from zippi1 on freesound, CC BY-NC.

### ❓ Not sure (36 files)

- `res-weapons/models/weapons/chaingun/*` (except the `flash0-3.flac` sounds): the new chaingun's `source.txt` points to a Sketchfab model ("Minigun XM214"). The repo doesn't say its license.
- `map-chasm/sound/chasm/generator.flac`, `drone1.flac`: map notes say "CC Sampling Plus", while other maps list the same freesound sounds as CC BY 3.0 / CC0. Check the freesound pages.
- `map-thunder/sound/thunder/*` (4 sounds): authors named, licenses not.
- `map-thunder/textures/es_crate/*`, `thunder_lightning_src/generatorlightning.png`: no author/license or made with a Filter Forge filter.
- `map-forlorn/textures/forlorn_yughues_src/rock01_*`: from a "free" yughues texture pack; the exact license isn't written down.
- `map-vega/models/mapobjects/vega/globe/globe.jpg`: Earth picture from a Celestia add-on by Jestr; license not written down.
- `unvanquished/gfx/feedback/vsay/flank.*`: built from three SVG Repo icons with mixed licenses.

---

## Full list

`assets-and-licenses.csv` in this repo has every file with its license, credit and link.
