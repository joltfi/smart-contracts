import { Interface, keccak256, toUtf8Bytes } from "ethers";

const iface = new Interface(["function setMinters(address[] _minters)"]);

const salt = keccak256(toUtf8Bytes("SetMinters01"));
const predecessor = keccak256(toUtf8Bytes("0"));
const target = "0x04502cA012e63558Efb5518b86Ab770A930b6687"; // multifee
const timelock = "0x272Cf01607783CC9DB7506244dc6ac2f113702FC";
const fixedIncentivesController = "0x02FBdb387A105fBdaF3b25A225D236384bAd46EE";

const encodedData = iface.encodeFunctionData("setMinters", [
  [fixedIncentivesController],
]);

console.log("timelock", timelock);
console.log("target", target);
console.log("data", encodedData);
console.log(
  "predecessor",
  "0x0000000000000000000000000000000000000000000000000000000000000000"
);

console.log("salt", salt);
console.log("minDelay", 259200);
