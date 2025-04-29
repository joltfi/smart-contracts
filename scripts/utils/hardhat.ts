const fs = require("fs");
const path = require("path");

/**
 * Extracts the address of a specified deployment component from Hardhat Ignition's deployment file.
 * @param {string} componentName - The name of the deployment component.
 * @returns {string | null} - The address of the component, or null if not found.
 */
export function getDeploymentAddress(componentName: string) {
  const filePath = path.resolve(
    __dirname,
    "..",
    "..",
    "ignition",
    "deployments",
    "chain-31337",
    "deployed_addresses.json"
  );

  try {
    // Read the deployed_addresses.json file
    const data = fs.readFileSync(filePath, "utf8");
    const deployments = JSON.parse(data);

    // Check if the component exists in the file
    // console.log(deployments);

    if (deployments?.[componentName]) {
      return deployments[componentName];
    } else {
      console.error(
        `Component "${componentName}" not found in the deployment file.`
      );
      return null;
    }
  } catch (error) {
    console.error("Error reading or parsing deployed_addresses.json:", error);
    return null;
  }
}
