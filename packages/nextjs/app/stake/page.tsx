"use client";

import { useEffect, useState } from "react";
import { formatUnits, parseUnits } from "viem";
import { useAccount, useReadContract, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { Address } from "~~/components/scaffold-eth";
import deployedContracts from "~~/contracts/deployedContracts";
import { useTargetNetwork } from "~~/hooks/scaffold-eth/useTargetNetwork";
import { notification } from "~~/utils/scaffold-eth";

/* eslint-disable react-hooks/exhaustive-deps */

const USDC_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

const ERC20_ABI = [
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    name: "allowance",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

const STAKING_ABI = [
  {
    inputs: [{ name: "amount", type: "uint256" }],
    name: "stake",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "amount", type: "uint256" }],
    name: "unstake",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "user", type: "address" }],
    name: "viewBalance",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalStaked",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export default function StakePage() {
  const { address } = useAccount();
  const { targetNetwork } = useTargetNetwork();
  const [stakeAmount, setStakeAmount] = useState("");
  const [unstakeAmount, setUnstakeAmount] = useState("");

  const stakingAddress = deployedContracts[84532]?.StakingAdapter?.address as `0x${string}`;

  const { data: usdcBalance, refetch: refetchUsdcBalance } = useReadContract({
    address: USDC_ADDRESS as `0x${string}`,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
  });

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: USDC_ADDRESS as `0x${string}`,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: address ? [address, stakingAddress] : undefined,
  });

  const { data: stakedBalance, refetch: refetchStakedBalance } = useReadContract({
    address: stakingAddress,
    abi: STAKING_ABI,
    functionName: "viewBalance",
    args: address ? [address] : undefined,
  });

  const { data: totalStaked, refetch: refetchTotalStaked } = useReadContract({
    address: stakingAddress,
    abi: STAKING_ABI,
    functionName: "totalStaked",
  });

  const { writeContract: approveUsdc, data: approveHash, isPending: isApprovePending } = useWriteContract();
  const { writeContract: stakeUsdc, data: stakeHash, isPending: isStakePending } = useWriteContract();
  const { writeContract: unstakeUsdc, data: unstakeHash, isPending: isUnstakePending } = useWriteContract();

  const { isLoading: isApproveLoading, isSuccess: isApproveSuccess } = useWaitForTransactionReceipt({
    hash: approveHash,
  });
  const { isLoading: isStakeLoading, isSuccess: isStakeSuccess } = useWaitForTransactionReceipt({ hash: stakeHash });
  const { isLoading: isUnstakeLoading, isSuccess: isUnstakeSuccess } = useWaitForTransactionReceipt({
    hash: unstakeHash,
  });

  useEffect(() => {
    if (isApproveSuccess && approveHash) {
      console.log("aprobacion confirmada, actualizando allowance...");
      setTimeout(() => {
        let attempts = 0;
        const maxAttempts = 10;
        const interval = setInterval(async () => {
          attempts++;
          console.log(`intento ${attempts} de actualizar allowance...`);
          const result = await refetchAllowance();
          if (result.data && result.data > 0n) {
            console.log("Allowance actualizado:", result.data);
            clearInterval(interval);
            notification.success("¡Aprobación exitosa! Ya puedes stakear");
          } else if (attempts >= maxAttempts) {
            console.log("Timeout, pero continua...");
            clearInterval(interval);
            notification.info("Aprobación completada");
          }
        }, 1000);
      }, 1000);
    }
  }, [isApproveSuccess, approveHash, refetchAllowance]);

  useEffect(() => {
    if (isStakeSuccess && stakeHash) {
      console.log("stake confirmado, actualizando balances...");
      setTimeout(() => {
        refetchUsdcBalance();
        refetchStakedBalance();
        refetchTotalStaked();
        setStakeAmount("");
        notification.success("¡Stake exitoso!");
      }, 1000);
    }
  }, [isStakeSuccess, stakeHash]);

  useEffect(() => {
    if (isUnstakeSuccess && unstakeHash) {
      console.log("Unstake confirmado, actualizando balances...");
      setTimeout(() => {
        refetchUsdcBalance();
        refetchStakedBalance();
        refetchTotalStaked();
        setUnstakeAmount("");
        notification.success("¡Unstake exitoso!");
      }, 1000);
    }
  }, [isUnstakeSuccess, unstakeHash]);

  const isCorrectNetwork = targetNetwork.id === 84532;

  // handlers
  const handleApprove = async () => {
    if (!stakeAmount || !address) return;

    try {
      const amount = parseUnits(stakeAmount, 6);

      approveUsdc({
        address: USDC_ADDRESS as `0x${string}`,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [stakingAddress, amount],
      });

      notification.info("aprobando usdc...");
    } catch (error) {
      console.error("error al aprobar", error);
      notification.error("error al aprobar USDC");
    }
  };

  const handleStake = async () => {
    if (!stakeAmount || !address) return;

    try {
      const amount = parseUnits(stakeAmount, 6);
      console.log("  allowance:", allowance);
      console.log("  balance USDC:", usdcBalance);
      if (!allowance || allowance === 0n) {
        notification.error("debes aprobar usdc primero no allowance");
        return;
      }

      if (allowance! < amount) {
        notification.error("allowance menor que amount");
        return;
      }
      if (!usdcBalance || usdcBalance < amount) {
        notification.error("balance insuficiente de USDC");
        return;
      }

      stakeUsdc({
        address: stakingAddress,
        abi: STAKING_ABI,
        functionName: "stake",
        args: [amount],
      });
      notification.info("stakeando usdc");
    } catch (error) {
      console.error("error al stakear", error);
      notification.error("error al stakear");
    }
  };

  const handleUnstake = async () => {
    if (!unstakeAmount || !address) return;
    try {
      const amount = parseUnits(unstakeAmount, 6);
      if (!stakedBalance || stakedBalance < amount) {
        notification.error("balance stakeado insuficiente");
        return;
      }

      unstakeUsdc({
        address: stakingAddress,
        abi: STAKING_ABI,
        functionName: "unstake",
        args: [amount],
      });

      notification.info("des-stakeando usdc...");
    } catch (error) {
      console.error("error al des-stakear", error);
      notification.error("error al des-stakear");
    }
  };

  const setMaxStake = () => {
    if (usdcBalance) {
      setStakeAmount(formatUnits(usdcBalance, 6));
    }
  };

  const setMaxUnstake = () => {
    if (stakedBalance) {
      setUnstakeAmount(formatUnits(stakedBalance, 6));
    }
  };

  if (!address) {
    return (
      <div className="flex items-center flex-col flex-grow pt-10">
        <div className="px-5">
          <h1 className="text-center text-4xl font-bold mb-4">🔒 Conecta tu Wallet</h1>
          <p className="text-center text-lg">Por favor conecta tu wallet para usar la dApp</p>
        </div>
      </div>
    );
  }

  if (!isCorrectNetwork) {
    return (
      <div className="flex items-center flex-col flex-grow pt-10">
        <div className="px-5">
          <h1 className="text-center text-4xl font-bold mb-4">⚠️ Red Incorrecta</h1>
          <p className="text-center text-lg">Por favor cambia a Sepolia testnet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center flex-col flex-grow pt-10">
      <div className="px-5 w-full max-w-4xl">
        <h1 className="text-center mb-8">
          <span className="block text-4xl font-bold">USDC Staking</span>
          <span className="block text-2xl mt-2 opacity-70">Gana intereses en Aave v3</span>
        </h1>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="card bg-primary shadow-xl">
            <div className="card-body">
              <h2 className="card-title text-sm opacity-80">Tu Balance USDC</h2>
              <p className="text-3xl font-bold">{usdcBalance ? formatUnits(usdcBalance, 6) : "0.00"}</p>
            </div>
          </div>

          <div className="card bg-secondary shadow-xl">
            <div className="card-body">
              <h2 className="card-title text-sm opacity-80">Tu Stakeado</h2>
              <p className="text-3xl font-bold">{stakedBalance ? formatUnits(stakedBalance, 6) : "0.00"}</p>
            </div>
          </div>

          <div className="card bg-accent shadow-xl">
            <div className="card-body">
              <h2 className="card-title text-sm opacity-80">Total Stakeado</h2>
              <p className="text-3xl font-bold">{totalStaked ? formatUnits(totalStaked, 6) : "0.00"}</p>
            </div>
          </div>
        </div>

        {/* Stake Section */}
        <div className="card bg-base-100 shadow-xl mb-6">
          <div className="card-body">
            <h2 className="card-title text-2xl mb-4">💰 Stakear USDC</h2>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Cantidad de USDC</span>
                <button className="btn btn-xs btn-ghost" onClick={setMaxStake}>
                  MAX
                </button>
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="0.00"
                  className="input input-bordered flex-grow"
                  value={stakeAmount}
                  onChange={e => setStakeAmount(e.target.value)}
                  disabled={isApprovePending || isStakePending}
                />
                <button
                  className="btn btn-accent"
                  onClick={handleApprove}
                  disabled={!stakeAmount || isApprovePending || isApproveLoading}
                >
                  {isApprovePending || isApproveLoading ? "Aprobando..." : "Aprobar"}
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleStake}
                  disabled={!stakeAmount || isStakePending || isStakeLoading || !allowance || allowance === 0n}
                >
                  {isStakePending || isStakeLoading ? "Stakeando..." : "Stakear"}
                </button>
              </div>
              <label className="label">
                <span className="label-text-alt">Allowance: {allowance ? formatUnits(allowance, 6) : "0.00"} USDC</span>
              </label>
            </div>
          </div>
        </div>

        {/* Unstake Section */}
        <div className="card bg-base-100 shadow-xl mb-8">
          <div className="card-body">
            <h2 className="card-title text-2xl mb-4">🔓 Des-stakear USDC</h2>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Cantidad de USDC</span>
                <button className="btn btn-xs btn-ghost" onClick={setMaxUnstake}>
                  MAX
                </button>
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="0.00"
                  className="input input-bordered flex-grow"
                  value={unstakeAmount}
                  onChange={e => setUnstakeAmount(e.target.value)}
                  disabled={isUnstakePending}
                />
                <button
                  className="btn btn-secondary"
                  onClick={handleUnstake}
                  disabled={!unstakeAmount || isUnstakePending || isUnstakeLoading}
                >
                  {isUnstakePending || isUnstakeLoading ? "Des-stakeando..." : "Des-stakear"}
                </button>
              </div>
              <label className="label">
                <span className="label-text-alt">
                  Disponible: {stakedBalance ? formatUnits(stakedBalance, 6) : "0.00"} USDC
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Wallet Info */}
        <div className="text-center opacity-70">
          <p className="text-sm mb-2">Conectado con:</p>
          <Address address={address} />
        </div>

        {/* Instructions */}
        <div className="alert alert-info mt-6">
          <div>
            <span className="font-bold">instrucciones:</span>
            <ol className="list-decimal list-inside mt-2 space-y-1">
              <li>Ingresa la cantidad de USDC que deseas stakear</li>
              <li>Haz click en Aprobar para dar permiso al contrato</li>
              <li>Una vez aprobado, haz click en Stakear</li>
              <li>¡Listo! Tus USDC están ganando intereses en Aave</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
