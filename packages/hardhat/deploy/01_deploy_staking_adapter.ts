import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const AAVE_POOL = "0x07eA79F68B2B3df564D0A34F8e19D9B1e339814b";
const USDC = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

const deployStakingAdapter: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  console.log("deployer", deployer);
  console.log("aave pool", AAVE_POOL);
  console.log("ESDC", USDC);

  await deploy("StakingAdapter", {
    from: deployer,
    args: [AAVE_POOL, USDC],
    log: true,
    autoMine: true,
  });

  console.log("✅ Contrato desplegado exitosamente!\n");
};

export default deployStakingAdapter;
deployStakingAdapter.tags = ["StakingAdapter"];
