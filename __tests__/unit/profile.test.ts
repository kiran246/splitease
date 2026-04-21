import { z } from 'zod';

// ---------------------------------------------------------------------------
// Inline helpers — duplicated from the route so this test has zero external deps
// ---------------------------------------------------------------------------

const updateSchema = z.object({
  name: z.string().min(1),
});

interface RawDbUser {
  id: string;
  name: string;
  email: string;
  password: string;
  createdAt: Date;
}

/** Mirrors the `select: { id, name, email }` that Prisma does in the route. */
function shapeProfileResponse(user: RawDbUser): { id: string; name: string; email: string } {
  const { id, name, email } = user;
  return { id, name, email };
}

// ---------------------------------------------------------------------------
// 1. Name validation
// ---------------------------------------------------------------------------

describe('name validation (updateSchema)', () => {
  it('accepts a normal non-empty name', () => {
    const result = updateSchema.safeParse({ name: 'Alice' });
    expect(result.success).toBe(true);
  });

  it('rejects an empty string', () => {
    const result = updateSchema.safeParse({ name: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issues = result.error.flatten().fieldErrors.name;
      expect(issues).toBeDefined();
      expect(issues!.length).toBeGreaterThan(0);
    }
  });

  /**
   * Documenting zod's min(1) behaviour with whitespace-only input:
   *
   * z.string().min(1) checks *length*, not content — a string of spaces like
   * "   " has length > 0, so it PASSES validation.  If the route wanted to
   * reject blank-looking names it would need z.string().trim().min(1) or a
   * custom refinement.  These two tests make that behaviour explicit.
   */
  it('passes for a whitespace-only string (min(1) counts spaces as characters)', () => {
    const result = updateSchema.safeParse({ name: '   ' });
    // "   ".length === 3, which satisfies min(1) — this is intentional zod behaviour.
    expect(result.success).toBe(true);
  });

  it('would fail for whitespace-only if schema used .trim().min(1)', () => {
    const strictSchema = z.object({ name: z.string().trim().min(1) });
    const result = strictSchema.safeParse({ name: '   ' });
    // After trimming, the string is "", which fails min(1).
    expect(result.success).toBe(false);
  });

  it('rejects a missing name field', () => {
    const result = updateSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects a non-string name', () => {
    const result = updateSchema.safeParse({ name: 42 });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 2. Profile response shaping
// ---------------------------------------------------------------------------

describe('shapeProfileResponse', () => {
  const rawUser: RawDbUser = {
    id: 'u1',
    name: 'Alice',
    email: 'alice@test.com',
    password: 'hashed_password_value',
    createdAt: new Date('2024-01-01T00:00:00Z'),
  };

  it('returns the correct id, name, and email', () => {
    const profile = shapeProfileResponse(rawUser);
    expect(profile.id).toBe('u1');
    expect(profile.name).toBe('Alice');
    expect(profile.email).toBe('alice@test.com');
  });

  it('does NOT include the password field', () => {
    const profile = shapeProfileResponse(rawUser);
    expect(profile).not.toHaveProperty('password');
  });

  it('does NOT include the createdAt field', () => {
    const profile = shapeProfileResponse(rawUser);
    expect(profile).not.toHaveProperty('createdAt');
  });

  it('returns an object with exactly three keys', () => {
    const profile = shapeProfileResponse(rawUser);
    expect(Object.keys(profile)).toHaveLength(3);
    expect(Object.keys(profile).sort()).toEqual(['email', 'id', 'name']);
  });
});
