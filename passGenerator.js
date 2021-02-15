import bcrypt from "bcryptjs";

async function getPass() {
  const hashedPassword = await bcrypt.hash("12345", 12);
  console.log(hashedPassword);
}

getPass();
