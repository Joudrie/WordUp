#!/bin/sh
# Downloads the kaikki.org Wiktionary dumps that scripts/build-words.mjs reads.
# Usage: scripts/fetch-wiktionary.sh [dir]   (default: ./data, which is git-ignored)
# English gives the headwords; the rest give the ancestor stages of each chain.
set -eu
DIR="${1:-data}"
mkdir -p "$DIR"
fetch() {
  # $1 = file name to save as, $2 = language name on kaikki.org, $3 = dump name
  enc=$(python3 -c "import urllib.parse,sys;print(urllib.parse.quote(sys.argv[1]))" "$2")
  curl -fsSL -m 3600 -o "$DIR/$1" "https://kaikki.org/dictionary/$enc/kaikki.org-dictionary-$3.jsonl"
  echo "fetched $1"
}
fetch English.jsonl English English
fetch Latin.jsonl Latin Latin
fetch OldEnglish.jsonl "Old English" OldEnglish
fetch MiddleEnglish.jsonl "Middle English" MiddleEnglish
fetch OldFrench.jsonl "Old French" OldFrench
fetch OldNorse.jsonl "Old Norse" OldNorse
fetch AncientGreek.jsonl "Ancient Greek" AncientGreek
fetch Arabic.jsonl Arabic Arabic
fetch ProtoGermanic.jsonl "Proto-Germanic" ProtoGermanic
fetch ProtoWestGermanic.jsonl "Proto-West Germanic" ProtoWestGermanic
fetch ProtoIndoEuropean.jsonl "Proto-Indo-European" ProtoIndoEuropean
curl -fsSL -o "$DIR/en_50k.txt" "https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/en/en_50k.txt"
echo "fetched en_50k.txt"
