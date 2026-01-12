import { BedrockAgentRuntimeClient, InvokeAgentCommand } from "@aws-sdk/client-bedrock-agent-runtime";

let globalConsultSessionId = null;

const region = import.meta.env.VITE_AWS_REGION;
const accessKeyId = import.meta.env.VITE_AWS_ACCESS_KEY_ID;
const secretAccessKey = import.meta.env.VITE_AWS_SECRET_ACCESS_KEY;
const agentId = import.meta.env.VITE_BEDROCK_AGENT_ID;
const agentAliasId = import.meta.env.VITE_BEDROCK_AGENT_ALIAS_ID;

const client = new BedrockAgentRuntimeClient({
  region: region,      
  credentials: {
    accessKeyId: accessKeyId, 
    secretAccessKey: secretAccessKey,
  },
});

export const callDigitalDoctorAgent = async (inputText) => {
  if (!globalConsultSessionId) {
    globalConsultSessionId = "consult-" + Date.now();
  }

  const command = new InvokeAgentCommand({
    agentId: agentId,
    agentAliasId: agentAliasId, 
    sessionId: globalConsultSessionId,
    inputText: inputText,
  });

  try {
    const response = await client.send(command);
    let completion = "";

    if (response.completion) {
      for await (const event of response.completion) {
        if (event.chunk) {
          const decoded = new TextDecoder("utf-8").decode(event.chunk.bytes);
          completion += decoded;
        }
      }
    }

    let finalOutput = completion
      .replace(/<thinking>[\s\S]*?<\/thinking>/g, '') 
      .replace(/<function_calls>[\s\S]*?<\/function_calls>/g, '')
      .trim();

    return finalOutput || "Processed successfully.";
  } catch (err) {
    console.error("AWS Bedrock Error:", err);
    return "Error generating plan. Ensure the Agent is 'Prepared' in the AWS Console.";
  }
};
