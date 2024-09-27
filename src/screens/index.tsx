import { Button } from "@/components/ui/button";
import { useState } from "react";

export function Index() {
  const [count, setCount] = useState(0);

  return (
    <div className="h-screen flex flex-col justify-center items-center">
      <Button onClick={() => setCount(count + 1)}>Click me!</Button>
      {count}
    </div>
  );
}
