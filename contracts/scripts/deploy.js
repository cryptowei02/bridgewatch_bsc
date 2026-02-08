const hre = require("hardhat");

async function main() {
  console.log("Deploying BridgeAttestation contract...");

  const BridgeAttestation = await hre.ethers.getContractFactory("BridgeAttestation");
  const attestation = await BridgeAttestation.deploy();
  await attestation.waitForDeployment();

  const address = await attestation.getAddress();
  console.log(`BridgeAttestation deployed to: ${address}`);
  console.log(`Network: ${hre.network.name}`);
  console.log(`\nUpdate your .env file:`);
  console.log(`ATTESTATION_CONTRACT_${hre.network.name === "bscTestnet" ? "BSC" : "OPBNB"}=${address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
