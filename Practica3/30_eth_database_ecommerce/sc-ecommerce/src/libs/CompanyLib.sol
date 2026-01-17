// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

library CompanyLib {
    struct Company {
        uint256 companyId;
        string name;
        address companyAddress;
        string taxId;
        bool isActive;
    }

    event CompanyRegistered(uint256 indexed companyId, address indexed companyAddress, string name);
    event CompanyUpdated(uint256 indexed companyId, string name, address companyAddress, bool isActive);

    function register(mapping(uint256 => Company) storage companies, uint256 nextId, string memory name, address companyAddress, string memory taxId) internal returns (uint256) {
        require(companyAddress != address(0), "Company: zero address");
        uint256 id = nextId;
        companies[id] = Company({companyId: id, name: name, companyAddress: companyAddress, taxId: taxId, isActive: true});
        emit CompanyRegistered(id, companyAddress, name);
        return id;
    }

    function get(mapping(uint256 => Company) storage companies, uint256 companyId) internal view returns (Company memory) {
        Company memory c = companies[companyId];
        require(c.companyAddress != address(0), "Company: not found");
        return c;
    }

    function update(mapping(uint256 => Company) storage companies, uint256 companyId, string memory name, address companyAddress, bool isActive) internal {
        Company storage c = companies[companyId];
        require(c.companyAddress != address(0), "Company: not found");
        c.name = name;
        c.companyAddress = companyAddress;
        c.isActive = isActive;
        emit CompanyUpdated(companyId, name, companyAddress, isActive);
    }
}
