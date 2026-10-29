// Who may change which request file. Maintainers (write access to the repo) skip these rules.
//
//   owner          edit records, edit collaborators, delete the name
//   collaborator   edit records only (not owner, not collaborators, no delete)
//   anyone         add a new name with themselves as owner, up to MAX_NAMES_PER_OWNER
//   transfer       changing `owner` always needs a maintainer
export const MAX_NAMES_PER_OWNER = 5;

export interface Change {
  file: string;
  /** Parsed file on main, or undefined if the PR adds it. */
  before?: unknown;
  /** Parsed file in the PR, or undefined if the PR deletes it. */
  after?: unknown;
}

export interface Problem {
  file?: string;
  message: string;
}

const lower = (s: unknown) => (typeof s === "string" ? s.trim().toLowerCase() : "");
const ownerOf = (r: unknown) => lower((r as { owner?: unknown } | undefined)?.owner);
const collaboratorsOf = (r: unknown) => {
  const c = (r as { collaborators?: unknown } | undefined)?.collaborators;
  return Array.isArray(c) ? c.map(lower).filter(Boolean).sort() : [];
};

export function authorize(author: string, changes: Change[], namesOwnedAfter: number): Problem[] {
  const me = lower(author);
  const problems: Problem[] = [];

  for (const { file, before, after } of changes) {
    if (before === undefined) {
      // after === null means the file did not parse; the format check reports that.
      if (after !== null && ownerOf(after) !== me) problems.push({ file, message: `owner must be your GitHub username (${author})` });
      continue;
    }
    const owner = ownerOf(before);
    if (!owner) {
      problems.push({ file, message: "this file has no valid owner on main; only a maintainer can change it" });
      continue;
    }
    if (after === undefined) {
      if (me !== owner) problems.push({ file, message: `only the owner (${owner}) can delete this name` });
      continue;
    }
    const isOwner = me === owner;
    if (!isOwner && !collaboratorsOf(before).includes(me)) {
      problems.push({ file, message: `you are not the owner (${owner}) or a collaborator of this name` });
      continue;
    }
    if (ownerOf(after) !== owner) problems.push({ file, message: "changing the owner needs a maintainer" });
    if (!isOwner && collaboratorsOf(after).join() !== collaboratorsOf(before).join()) {
      problems.push({ file, message: `only the owner (${owner}) can change collaborators` });
    }
  }

  if (changes.some((c) => c.before === undefined) && namesOwnedAfter > MAX_NAMES_PER_OWNER) {
    problems.push({ message: `you can own at most ${MAX_NAMES_PER_OWNER} names (this PR would make ${namesOwnedAfter})` });
  }
  return problems;
}
