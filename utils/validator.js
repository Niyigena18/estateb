const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

const validatePhone = (phone) => {
  const re = /^\+250\d{9}$/;
  return re.test(phone);
};

module.exports = { validateEmail, validatePhone };
