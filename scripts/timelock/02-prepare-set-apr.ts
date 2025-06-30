import { Interface, keccak256, toUtf8Bytes } from "ethers";

const iface = new Interface(["function setAPR(uint256 newAPR)"]);

const encodedData = iface.encodeFunctionData("setAPR", [223147795]);

const salt = keccak256(toUtf8Bytes("setRewardsY1M1"));
const predecessor = keccak256(toUtf8Bytes("0"));
const timelock = "0x272Cf01607783CC9DB7506244dc6ac2f113702FC";

console.log("timelock", timelock);
console.log("target", "0x0774275e354561c2edcaac816f2ce7971aca1d9a");
console.log("data", encodedData);
console.log(
  "predecessor",
  "0x0000000000000000000000000000000000000000000000000000000000000000"
);

console.log("salt", salt);
console.log("minDelay", 259200);
