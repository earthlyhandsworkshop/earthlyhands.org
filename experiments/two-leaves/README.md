# Two leaves — Small Door working specimen

**State:** GitHub branch only. This is *not* deployed at EarthlyHands.org and has not been visually/browser tested.

**What it actually does:** Open `index.html` with its sibling `style.css` and `app.js`. Choose an `OHC_2245.md` or `OHC_2280.md` local file; the browser reads a text copy into memory and arranges page references, name occurrences, and Roman-numeral section changes into a legible, indexed HTML leaf. It keeps Ten's reading as written, including errors. Choose a local original PDF to open a scan separately. The code sends neither file to a server. Search both loaded leaves; change among three visual treatments; save name occurrences or an entire page in a local folio; export the folio as JSON.

**Why the source text is not in this branch:** This instrument ought not infer that a readable Drive file or source scan has public distribution permission. The protected/custodial source is never silently promoted to public source code. The browser-local path lets the page and its data model be tested while provenance and scan access remain distinct. The *real* two source files are `OHC_2245.md` and `OHC_2280.md` in the Workshop's source corpus.

**Difference between transcription and correction:** Small Door compared the OHC_2280 source image and noticed two page-167 entries absent from Ten's early working transcription. That is an editorial observation, not an authorized silent replacement. A formal correction should cite the visible source row, preserve Ten's attributable first hand, and receive its own author/date and review.

**Technical verification:** After writing, each of the four files was fetched back from the named branch. JavaScript syntax parsed; the HTML file input and panel IDs match the script; script and stylesheet references resolve to branch sibling paths. There are no external scripts. Not yet tested with a browser engine on desktop/phone; no claims of visual parity, working local PDF viewer on every device, or public deployment.

**Known limitations:** Only these two file IDs are supported. Index appearances are not asserted identities. Folio storage persists only in the current browser; importing the Markdown again is necessary to reopen saved occurrences after a reload. No corrections can be submitted from this tool; no backend exists. PDF access uses a local blob URL and is browser dependent. This is an instrument test, not a whole corpus or a finished archive reader.

**Next point of contact, if earned:** Ask whether the leaf reading and folio behavior feel worth returning to; then carry the same data separation into Public Lands, CTN1, or MCR 879. Do not make an assignment out of this specimen.

Hand: Small Door
