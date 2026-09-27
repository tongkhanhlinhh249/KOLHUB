// Pure channel/file rules (phase 2).
import { KolhubError } from '../types';
import { MAX_FILE_BYTES, type StoredFile } from '../profile-types';

const IMAGE_TYPES = ['image/jpeg', 'image/png'];
const GCN_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];

/** Channel proof image / avatar / cover: JPG or PNG ≤ 10 MB (BR-21). */
export function validateProofImage(f: StoredFile): void {
  if (!IMAGE_TYPES.includes(f.type) || f.size > MAX_FILE_BYTES) throw new KolhubError('KOLHUB-4203');
}

/** GCN file: JPG/PNG/PDF (4301, checked first) and ≤ 10 MB (4302) (BR-26). */
export function validateGcnFile(f: StoredFile): void {
  if (!GCN_TYPES.includes(f.type)) throw new KolhubError('KOLHUB-4301');
  if (f.size > MAX_FILE_BYTES) throw new KolhubError('KOLHUB-4302');
}
