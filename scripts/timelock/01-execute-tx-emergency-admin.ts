import { Interface, keccak256, toUtf8Bytes } from "ethers";

const iface = new Interface([
  "function setEmergencyAdmin(address newEmergencyAdmin)",
]);

const encodedData = iface.encodeFunctionData("setEmergencyAdmin", [
  "0xB398912fb49dda4F0BbE35B16CbEe4bA28Ac76e3",
]);

const salt = keccak256(toUtf8Bytes("setEmergencyAdmin-001"));
const predecessor = keccak256(toUtf8Bytes("0"));

console.log("data", encodedData);
console.log("salt", salt);
console.log(
  "predecessor",
  "0x0000000000000000000000000000000000000000000000000000000000000000"
);
