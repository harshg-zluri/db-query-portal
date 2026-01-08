import {
    sanitizeMongoInput,
    detectSqlInjection,
    sanitizeForDisplay,
    sanitizeFileName,
    truncate,
    isDangerousDDL,
    isDangerousMongoMethod
} from '../../../src/utils/sanitizer';

describe('Sanitizer Utils', () => {
    describe('sanitizeMongoInput', () => {
        it('should pass safe input', () => {
            const input = 'db.users.find({name: "test"})';
            expect(sanitizeMongoInput(input)).toBe(input);
        });

        it('should reject $where operator', () => {
            expect(() => sanitizeMongoInput('db.users.find({$where: "this.a == this.b"})'))
                .toThrow('Dangerous operator "$where" is not allowed');
        });

        it('should reject $function operator', () => {
            expect(() => sanitizeMongoInput('db.users.aggregate({$function: {}})'))
                .toThrow('Dangerous operator "$function" is not allowed');
        });

        it('should reject $accumulator operator', () => {
            expect(() => sanitizeMongoInput('db.users.aggregate({$accumulator: {}})'))
                .toThrow('Dangerous operator "$accumulator" is not allowed');
        });

        it('should reject mapReduce', () => {
            expect(() => sanitizeMongoInput('db.users.mapReduce(function(){}, function(){})'))
                .toThrow('Dangerous operator "mapReduce" is not allowed');
        });

        it('should reject $expr operator', () => {
            expect(() => sanitizeMongoInput('db.users.find({$expr: {}})'))
                .toThrow('Dangerous operator "$expr" is not allowed');
        });

        it('should reject JavaScript functions', () => {
            expect(() => sanitizeMongoInput('{"key": function() {}}'))
                .toThrow('JavaScript functions are not allowed');
        });

        it('should reject JavaScript functions with space', () => {
            expect(() => sanitizeMongoInput('{"key": function () {}}'))
                .toThrow('JavaScript functions are not allowed');
        });
    });

    describe('detectSqlInjection', () => {
        it('should return false for safe input', () => {
            expect(detectSqlInjection('John Smith')).toBe(false);
        });

        it('should detect comment injection', () => {
            expect(detectSqlInjection("admin'--")).toBe(true);
        });

        it('should detect UNION injection', () => {
            expect(detectSqlInjection('1 UNION SELECT * FROM passwords')).toBe(true);
        });

        it('should detect OR 1=1 pattern', () => {
            expect(detectSqlInjection("' OR 1=1 --")).toBe(true);
        });

        it('should detect AND 1=1 pattern', () => {
            expect(detectSqlInjection("' AND 1=1")).toBe(true);
        });

        it('should detect DROP TABLE', () => {
            expect(detectSqlInjection('DROP TABLE users')).toBe(true);
        });

        it('should detect semicolon injection', () => {
            expect(detectSqlInjection("1; DROP TABLE users")).toBe(true);
        });

        it('should detect block comment', () => {
            expect(detectSqlInjection("admin/*comment*/")).toBe(true);
        });
        expect(detectSqlInjection("admin/*comment*/")).toBe(true);
    });
});

describe('isDangerousDDL', () => {
    it('should detect DROP TABLE', () => {
        expect(isDangerousDDL('DROP TABLE users')).toBe(true);
    });

    it('should detect TRUNCATE TABLE', () => {
        expect(isDangerousDDL('TRUNCATE TABLE users')).toBe(true);
    });

    it('should detect ALTER TABLE', () => {
        expect(isDangerousDDL('ALTER TABLE users ADD COLUMN foo int')).toBe(true);
    });

    it('should detect CREATE VIEW', () => {
        expect(isDangerousDDL('CREATE VIEW my_view AS SELECT * FROM users')).toBe(true);
    });

    it('should allow SELECT', () => {
        expect(isDangerousDDL('SELECT * FROM users')).toBe(false);
    });

    it('should allow DELETE (DML)', () => {
        expect(isDangerousDDL('DELETE FROM users WHERE id = 1')).toBe(false);
    });

    it('should allow INSERT (DML)', () => {
        expect(isDangerousDDL('INSERT INTO users VALUES (1)')).toBe(false);
    });
});

describe('isDangerousMongoMethod', () => {
    it('should detect .drop()', () => {
        expect(isDangerousMongoMethod('db.collection("users").drop()')).toBe(true);
    });

    it('should detect .dropDatabase()', () => {
        expect(isDangerousMongoMethod('db.dropDatabase()')).toBe(true);
    });

    it('should detect .remove()', () => {
        expect(isDangerousMongoMethod('db.users.remove({})')).toBe(true);
    });

    it('should allow .find()', () => {
        expect(isDangerousMongoMethod('db.users.find({})')).toBe(false);
    });

    it('should allow .insertOne()', () => {
        expect(isDangerousMongoMethod('db.users.insertOne({})')).toBe(false);
    });
});

describe('sanitizeForDisplay', () => {
    it('should escape HTML entities', () => {
        expect(sanitizeForDisplay('<script>alert("xss")</script>'))
            .toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
    });

    it('should escape ampersand', () => {
        expect(sanitizeForDisplay('foo & bar')).toBe('foo &amp; bar');
    });

    it('should escape single quotes', () => {
        expect(sanitizeForDisplay("it's")).toBe('it&#x27;s');
    });

    it('should handle normal text', () => {
        expect(sanitizeForDisplay('Hello World')).toBe('Hello World');
    });
});

describe('sanitizeFileName', () => {
    it('should pass valid filename', () => {
        expect(sanitizeFileName('script.js')).toBe('script.js');
    });

    it('should allow underscores and hyphens', () => {
        expect(sanitizeFileName('my-script_v2.js')).toBe('my-script_v2.js');
    });

    it('should remove path traversal', () => {
        expect(sanitizeFileName('../../../etc/passwd.js')).toBe('etcpasswd.js');
    });

    it('should remove slashes', () => {
        expect(sanitizeFileName('path/to/script.js')).toBe('pathtoscript.js');
    });

    it('should replace invalid characters', () => {
        expect(sanitizeFileName('script@test!.js')).toBe('script_test_.js');
    });

    it('should reject non-js files', () => {
        expect(() => sanitizeFileName('script.py'))
            .toThrow('Only .js files are allowed');
    });

    it('should reject files without extension', () => {
        expect(() => sanitizeFileName('script'))
            .toThrow('Only .js files are allowed');
    });
});

describe('truncate', () => {
    it('should not truncate short strings', () => {
        expect(truncate('Hello', 500)).toBe('Hello');
    });

    it('should truncate long strings', () => {
        const longString = 'a'.repeat(600);
        const result = truncate(longString, 500);
        expect(result.length).toBe(503); // 500 + "..."
        expect(result.endsWith('...')).toBe(true);
    });

    it('should use default max length', () => {
        const longString = 'a'.repeat(600);
        const result = truncate(longString);
        expect(result.length).toBe(503);
    });

    it('should handle exact length', () => {
        const exactString = 'a'.repeat(500);
        expect(truncate(exactString, 500)).toBe(exactString);
    });
});
