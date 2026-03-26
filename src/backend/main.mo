actor {
  type PresaleConfig = {
    walletAddress : Text;
    presaleEndTimestamp : Int;
    softCapSol : Float;
    tokenName : Text;
  };

  var presaleConfig : PresaleConfig = {
    walletAddress = "";
    presaleEndTimestamp = 0;
    softCapSol = 0.0;
    tokenName = "";
  };

  public shared ({ caller }) func setConfig(walletAddress : Text, presaleEndTimestamp : Int, softCapSol : Float, tokenName : Text) : async () {
    presaleConfig := {
      walletAddress;
      presaleEndTimestamp;
      softCapSol;
      tokenName;
    };
  };

  public query ({ caller }) func getConfig() : async PresaleConfig {
    presaleConfig;
  };

  public query ({ caller }) func getWalletAddress() : async Text {
    presaleConfig.walletAddress;
  };

  public query ({ caller }) func getPresaleEndTimestamp() : async Int {
    presaleConfig.presaleEndTimestamp;
  };

  public query ({ caller }) func getSoftCapSol() : async Float {
    presaleConfig.softCapSol;
  };

  public query ({ caller }) func getTokenName() : async Text {
    presaleConfig.tokenName;
  };
};
