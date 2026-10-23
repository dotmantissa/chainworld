"""Import complete JSON members from a fetched IPFS directory archive; never extract paths."""
import hashlib
import json
from pathlib import Path
import tarfile

root=Path('data/chog')
checkpoint=json.loads((root/'checkpoint.json').read_text())
uris={}
for token_id,uri in checkpoint['uris'].items():
    uris.setdefault(uri.removeprefix('ipfs://'),[]).append(int(token_id))
imported=0
try:
    with tarfile.open(root/'source-archive.tar',mode='r|') as archive:
        for member in archive:
            if not member.isfile() or member.name not in uris:
                continue
            if member.size>2_000_000:
                raise ValueError('Metadata member too large')
            data=archive.extractfile(member)
            if data is None:
                raise ValueError('Missing member bytes')
            metadata=json.load(data)
            if not isinstance(metadata.get('name'),str) or not isinstance(metadata.get('image'),str) or not isinstance(metadata.get('attributes'),list) or not metadata['attributes']:
                raise ValueError('Invalid original metadata: '+member.name)
            if any(not isinstance(a.get('trait_type'),str) or not isinstance(a.get('value'),str) for a in metadata['attributes']):
                raise ValueError('Invalid original traits: '+member.name)
            encoded=json.dumps(metadata,ensure_ascii=False,separators=(',',':')).encode()
            for token_id in uris[member.name]:
                target=root/f'{token_id}.json'
                if target.exists():
                    continue
                token={'tokenId':token_id,'uri':'ipfs://'+member.name,'metadata':metadata,'sha256':hashlib.sha256(encoded).hexdigest()}
                temporary=target.with_suffix('.json.tmp')
                temporary.write_text(json.dumps(token,ensure_ascii=False,separators=(',',':')))
                temporary.replace(target)
                imported+=1
except (tarfile.ReadError,EOFError):
    print('Archive stream is incomplete; imported only fully received metadata members.')
print(f'Imported {imported} authentic source records; total cached: {len(list(root.glob("[0-9]*.json")))}')
