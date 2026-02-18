"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import ClockWidget from "./ClockWidget";

interface ClockTickControlsProps {
  clockId: string;
  name: string;
  filled: number;
  segments: number;
  isCompleted: boolean;
}

export default function ClockTickControls({
  clockId,
  name,
  filled,
  segments,
  isCompleted,
}: ClockTickControlsProps) {
  const [ticking, setTicking] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleTick = async (ticks: number) => {
    setTicking(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) return;

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      await fetch(`${apiUrl}/clocks/${clockId}/tick`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ ticks }),
      });

      router.refresh();
    } finally {
      setTicking(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <ClockWidget filled={filled} total={segments} label="" />
      <div className="flex items-center gap-1">
        <button
          onClick={() => handleTick(-1)}
          disabled={ticking || filled <= 0}
          className="w-7 h-7 flex items-center justify-center bg-gray-600 hover:bg-gray-500 disabled:opacity-40 disabled:cursor-not-allowed rounded text-sm font-bold"
        >
          -
        </button>
        <button
          onClick={() => handleTick(1)}
          disabled={ticking || isCompleted}
          className="w-7 h-7 flex items-center justify-center bg-gray-600 hover:bg-gray-500 disabled:opacity-40 disabled:cursor-not-allowed rounded text-sm font-bold"
        >
          +
        </button>
      </div>
    </div>
  );
}
