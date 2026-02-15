export async function hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export interface PasswordRequirements {
    length: boolean;
    upper: boolean;
    lower: boolean;
    digit: boolean;
    special: boolean;
}

export function checkPasswordRequirements(password: string): PasswordRequirements {
    return {
        length: password.length >= 8,
        upper: /[A-Z]/.test(password),
        lower: /[a-z]/.test(password),
        digit: /[0-9]/.test(password),
        special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password),
    };
}

export function allRequirementsMet(reqs: PasswordRequirements): boolean {
    return reqs.length && reqs.upper && reqs.lower && reqs.digit && reqs.special;
}

export function getPasswordStrength(reqs: PasswordRequirements): { level: number; key: string; color: string } {
    const count = Object.values(reqs).filter(Boolean).length;
    if (count <= 2) return { level: 1, key: 'password.strength_weak', color: '#FF375F' };
    if (count <= 3) return { level: 2, key: 'password.strength_medium', color: '#FF9F0A' };
    if (count <= 4) return { level: 3, key: 'password.strength_strong', color: '#30D158' };
    return { level: 4, key: 'password.strength_excellent', color: '#0A84FF' };
}
