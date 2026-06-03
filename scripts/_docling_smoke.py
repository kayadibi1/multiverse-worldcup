"""Smoke test: confirm Docling parses a real document end-to-end on this machine."""
import sys, time
from docling.document_converter import DocumentConverter

path = sys.argv[1]
t = time.time()
conv = DocumentConverter()
print(f"[docling] converter init: {time.time()-t:.1f}s")
t = time.time()
res = conv.convert(path)
print(f"[docling] convert: {time.time()-t:.1f}s")
md = res.document.export_to_markdown()
print(f"[docling] exported {len(md)} chars of markdown")
print("---FIRST 300 CHARS---")
print(md[:300])
print("---OK---")
