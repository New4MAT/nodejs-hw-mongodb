export const formatResponse = (status, message, data = null) => {
  const response = {
    status,
    message,
  };

  if (data) {
    response.data = data;
  }

  return response;
};
