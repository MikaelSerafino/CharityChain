// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract CharityChain {
    struct Campaign {
        uint256 id;
        address payable owner;
        string title;
        string description;
        string[] imageURLs; // multiple pictures ✅
        uint256 goal;
        uint256 totalRaised;
        bool active;
        bool finished;
        uint256 createdAt;
    }

    struct Donation {
        address donor;
        uint256 amount;
        uint256 timestamp; // ✅ time + date tracking
    }

    mapping(uint256 => Campaign) public campaigns;
    mapping(uint256 => Donation[]) public campaignDonations;
    uint256 public campaignCount;

    // Platform configuration
    address payable public platformWallet;
    uint256 public baseFee = 0.005 ether; // ✅ flat startup fee (collected when creating)
    uint256 public maxFeePercent = 1000; // = 10.00% maximum dynamic donor fee

    event CampaignCreated(
        uint256 id,
        address owner,
        string title,
        uint256 goal
    );
    event DonationReceived(uint256 id, address donor, uint256 amount);
    event CampaignFinished(uint256 id);
    event PlatformFeeTaken(address from, uint256 amount);

    constructor(address payable _platformWallet) {
        platformWallet = _platformWallet;
    }

    // ✅ create campaign with scaled startup fee
    function createCampaign(
        string memory _title,
        string memory _description,
        string[] memory _imageURLs,
        uint256 _goal
    ) external payable {
        require(_goal > 0, "Goal must be positive");

        // 🔹 Calculate dynamic startup fee (scaled with goal)
        uint256 goalKPGT = _goal / 1e18; // convert wei → tokens
        uint256 feePercent;

        if (goalKPGT <= 1) {
            feePercent = 10; // 0.1%
        } else if (goalKPGT >= 15) {
            feePercent = 150; // 1.5%
        } else {
            // Linear scaling between 1 and 15 KPGT
            feePercent = 10 + ((goalKPGT - 1) * 10); // ~0.1% increase per KPGT
        }

        uint256 fee = (_goal * feePercent) / 10000; // convert basis points to %

        require(msg.value >= fee, "Insufficient startup fee");

        // 🔹 Transfer fee to platform wallet
        platformWallet.transfer(fee);
        emit PlatformFeeTaken(msg.sender, fee);

        // ✅ Create campaign
        campaigns[campaignCount] = Campaign({
            id: campaignCount,
            owner: payable(msg.sender),
            title: _title,
            description: _description,
            imageURLs: _imageURLs,
            goal: _goal,
            totalRaised: 0,
            active: true,
            finished: false,
            createdAt: block.timestamp
        });

        emit CampaignCreated(campaignCount, msg.sender, _title, _goal);
        campaignCount++;
    }

    // ✅ donation with dynamic fee
    function donate(uint256 _id) external payable {
        require(_id < campaignCount, "Campaign does not exist");
        Campaign storage c = campaigns[_id];
        require(c.active, "Campaign not active");
        require(!c.finished, "Campaign already finished");
        require(msg.value > 0, "Donation must be greater than zero");

        // Calculate dynamic fee based on amount
        uint256 feePercent = getDynamicFee(msg.value);
        uint256 fee = (msg.value * feePercent) / 10000; // basis points
        uint256 net = msg.value - fee;

        // send fee to platform
        platformWallet.transfer(fee);
        emit PlatformFeeTaken(msg.sender, fee);

        // record donation
        c.totalRaised += net;
        campaignDonations[_id].push(
            Donation(msg.sender, msg.value, block.timestamp)
        );

        // mark campaign as finished if goal reached
        if (c.totalRaised >= c.goal) {
            c.active = false;
            c.finished = true;
            emit CampaignFinished(_id);
        }

        emit DonationReceived(_id, msg.sender, msg.value);
    }

    // ✅ dynamic fee formula — small donations pay less, large ones pay more
    function getDynamicFee(uint256 amount) public view returns (uint256) {
        // 0.01% for 1 token (1e18), up to 1% for 100 tokens
        // Scale linearly with log10
        if (amount < 1 ether)
            return 1; // 0.01%
        else if (amount < 10 ether)
            return 50; // 0.5%
        else if (amount < 100 ether)
            return 100; // 1%
        else return maxFeePercent; // cap at 10%
    }

    // ✅ view all finished campaigns (pagination ready)
    function getFinishedCampaignsPaginated(
        uint256 _offset,
        uint256 _limit
    ) external view returns (Campaign[] memory, uint256 total) {
        uint256 finishedCount = 0;
        for (uint256 i = 0; i < campaignCount; i++) {
            if (campaigns[i].finished) finishedCount++;
        }

        uint256 end = _offset + _limit;
        if (end > finishedCount) end = finishedCount;
        uint256 size = end > _offset ? end - _offset : 0;

        Campaign[] memory result = new Campaign[](size);
        uint256 idx = 0;
        uint256 counted = 0;

        for (uint256 i = 0; i < campaignCount && idx < size; i++) {
            if (campaigns[i].finished) {
                if (counted >= _offset) {
                    result[idx] = campaigns[i];
                    idx++;
                }
                counted++;
            }
        }
        return (result, finishedCount);
    }

    // ✅ read active campaigns for homepage
    function getActiveCampaignsPaginated(
        uint256 _offset,
        uint256 _limit
    ) external view returns (Campaign[] memory, uint256 total) {
        uint256 activeCount = 0;
        for (uint256 i = 0; i < campaignCount; i++) {
            if (campaigns[i].active && !campaigns[i].finished) activeCount++;
        }

        uint256 end = _offset + _limit;
        if (end > activeCount) end = activeCount;
        uint256 size = end > _offset ? end - _offset : 0;

        Campaign[] memory result = new Campaign[](size);
        uint256 idx = 0;
        uint256 counted = 0;

        for (uint256 i = 0; i < campaignCount && idx < size; i++) {
            if (campaigns[i].active && !campaigns[i].finished) {
                if (counted >= _offset) {
                    result[idx] = campaigns[i];
                    idx++;
                }
                counted++;
            }
        }

        return (result, activeCount);
    }

    // ✅ get donation history
    function getDonations(
        uint256 _id
    ) external view returns (Donation[] memory) {
        return campaignDonations[_id];
    }
}
