import FormFoundItem from "../component/FormFoundItem";

const FoundItem = () => {
  return (
    <div className="min-h-screen bg-[#f7f3ea] px-4 py-5 text-slate-900 sm:px-8">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-6 text-2xl font-bold">แจ้งพบสิ่งของ</h1>
        <FormFoundItem />
      </div>
    </div>
  );
};

export default FoundItem;
