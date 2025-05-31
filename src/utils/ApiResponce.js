class ApiResponse {
  constructor(status, message, data ="Success") {
    this.statusCode = statusCode
    this.data = data;
    this.message = message;
    this.success = status < 400
  }

}
export { ApiResponse };