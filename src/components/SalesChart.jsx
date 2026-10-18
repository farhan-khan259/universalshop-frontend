import React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { money } from "../api";
export default function SalesChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="sales-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3c78ed" stopOpacity={0.23} />
            <stop offset="100%" stopColor="#3c78ed" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="_id"
          tickFormatter={(v) => v.slice(5)}
          axisLine={false}
          tickLine={false}
          tick={{ fill: "#8b95a5", fontSize: 11 }}
        />
        <YAxis
          tickFormatter={(v) =>
            v / 100 >= 1000 ? Math.round(v / 100000) + "k" : v / 100
          }
          axisLine={false}
          tickLine={false}
          tick={{ fill: "#8b95a5", fontSize: 11 }}
        />
        <Tooltip formatter={money} />
        <Area
          isAnimationActive={false}
          type="monotone"
          dataKey="sales"
          stroke="#3371ea"
          strokeWidth={3}
          fill="url(#sales-fill)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
