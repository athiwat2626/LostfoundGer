import React from "react";
import bg from "../assets/images/bg2.png";
import logo from "../assets/images/logo.png";

const Loading = () => {
  return (
    <div className="relative w-screen h-screen overflow-hidden">
      {/* Background */}
      <img
        src={bg}
        alt="Background"
        className="absolute inset-0 w-full h-full object-cover"
      />

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {/* Logo */}
        <img
          src={logo}
          alt="Logo"
          className="w-52 mb-10"
        />

        {/* Spinner */}
        <div className="relative w-10 h-10">
          {[...Array(10)].map((_, i) => (
            <div
              key={i}
              className="absolute left-1/2 top-1/2 w-[3px] h-[14px] rounded-full bg-[#006664] origin-bottom animate-pulse"
              style={{
                transform: `translate(-50%, -100%) rotate(${36 * (i + 1)}deg) translateY(-14px)`,
                animationDelay: `${i * 0.1}s`,
                animationDuration: "1s",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Loading;