const notify = [
  { id: 1, name: "test", checked: true },
  { id: 2, name: "test1", checked: true },
  { id: 3, name: "test2", checked: false },
];

const asd = [
  { id: 1, name: "test" },
  { id: 2, name: "test1" },
  { id: 3, name: "test2" },
  { id: 4, name: "test3" },
  { id: 5, name: "test4" },
  { id: 6, name: "test5" },
  { id: 7, name: "test6" },
];

const newArr = [];

asd.map((x) => {
  const newNotify = notify.find((s) => s.id === x.id);

  if (newNotify) {
    return newArr.push({ ...x, checked: newNotify.checked });
  } else {
    newArr.push({ ...x, checked: false });
  }
});

console.log(newArr);
