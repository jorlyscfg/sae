import bcrypt from 'bcryptjs';

async function test() {
    const pass = 'password123';
    const hash = await bcrypt.hash(pass, 10);
    console.log(`Hash: ${hash}`);
    const match = await bcrypt.compare(pass, hash);
    console.log(`Match: ${match}`);

    // Test with the hash from DB (if I had its full value, but I know it's $2b$)
}

test();
