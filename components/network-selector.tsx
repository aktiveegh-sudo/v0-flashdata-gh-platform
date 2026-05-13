"use client"

import { motion } from "framer-motion"
import Image from "next/image"

interface Network {
  id: string
  name: string
  logo: string
  color: string
}

const networks: Network[] = [
  { id: "mtn", name: "MTN", logo: "/networks/mtn.png", color: "#FFCC00" },
  { id: "vodafone", name: "Vodafone", logo: "/networks/vodafone.png", color: "#E60000" },
  { id: "airteltigo", name: "AirtelTigo", logo: "/networks/airteltigo.png", color: "#FF0000" },
  { id: "glo", name: "Glo", logo: "/networks/glo.png", color: "#00A651" }
]

interface NetworkSelectorProps {
  selected: string
  onSelect: (id: string) => void
}

export function NetworkSelector({ selected, onSelect }: NetworkSelectorProps) {
  return (
    <div className="grid grid-cols-4 gap-3">
      {networks.map((network, index) => (
        <motion.button
          key={network.id}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.05 }}
          onClick={() => onSelect(network.id)}
          className={`relative p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${
            selected === network.id
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50 bg-card"
          }`}
        >
          {selected === network.id && (
            <motion.div
              layoutId="network-selected"
              className="absolute inset-0 bg-primary/10 rounded-2xl"
              transition={{ type: "spring", duration: 0.3 }}
            />
          )}
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg"
            style={{ backgroundColor: network.color }}
          >
            {network.name.charAt(0)}
          </div>
          <span className="text-sm font-medium text-foreground relative z-10">{network.name}</span>
        </motion.button>
      ))}
    </div>
  )
}
