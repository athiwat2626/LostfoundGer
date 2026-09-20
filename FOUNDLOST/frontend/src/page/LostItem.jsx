import React, { useRef, useState } from "react";
import FormLostItem from "../component/FormLostItem";

const LostItem = () => {
  return (
    <div className="min-h-screen bg-[#f7f3ea] py-8 px-4">
      <div className="max-w-4xl mx-auto p-6 bg-white shadow-sm rounded-2xl border border-slate-100">
        <h1 className="text-3xl font-bold mb-6 text-gray-900">รายงานของที่หาย</h1>
        <FormLostItem />
      </div>
    </div>
  );
};

export default LostItem;
