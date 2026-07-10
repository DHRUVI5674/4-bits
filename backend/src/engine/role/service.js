/*
  role/service.js
  Thin wrapper exposing engine functionality for application services to use.
*/

class RoleEngineService {
  constructor({ roleEngine }) {
    this.roleEngine = roleEngine;
  }

  async generateRole(payload) {
    return this.roleEngine.generateRole(payload);
  }
}

export default RoleEngineService;
