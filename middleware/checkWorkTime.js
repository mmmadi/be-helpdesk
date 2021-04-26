const checkWorkTime = (date) => {
  const dayName = new Intl.DateTimeFormat("ru-RU", { weekday: "long" }).format(
    date
  );
  const time = date.getTime();

  const startJobTime = new Date().setHours(9, 0, 0);
  const endJobTime = new Date().setHours(18, 0, 0);

  if (dayName !== "суббота" && dayName !== "воскресенье") {
    if (time >= startJobTime && time < endJobTime) {
      return true;
    } else {
      return false;
    }
  } else {
    return false;
  }
};

module.exports = checkWorkTime;
