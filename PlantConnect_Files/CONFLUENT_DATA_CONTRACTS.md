# Confluent Data Contracts - Do You Need Them?

## Short Answer: **No, not required for the hackathon!**

For the **AI Partner Catalyst Hackathon**, you **do NOT need to set up data contracts** in Confluent Cloud. Your JSON data will stream and work perfectly fine without them.

## What Are Data Contracts?

Data contracts (also called **Schema Registry** in Confluent) are optional schemas that:
- Define the structure of your Kafka messages
- Enable schema validation
- Help with data evolution over time
- Provide better documentation

## For the Hackathon Demo

✅ **What you need:**
- Create Kafka topics in Confluent Cloud
- Stream JSON data to those topics
- That's it!

❌ **What you DON'T need:**
- Schema Registry setup
- Data contracts
- Schema validation
- Schema evolution rules

## Your Current Setup

Your app streams JSON like this:

```json
{
  "device_id": "plant01",
  "plant_type": "Monstera",
  "timestamp": 1234567890,
  "environment": {
    "temperature_c": 24.3,
    "humidity_pct": 55.2,
    "light_lux": 12000
  },
  "soil": {
    "moisture_pct": 38.5,
    "soil_temp_c": 22.1
  },
  "vitality": {
    "capacitance": 73,
    "touch_events_last_min": 5
  }
}
```

This works perfectly **without** any schema definition in Confluent!

## When Would You Use Data Contracts?

Data contracts are useful in **production** when:
- Multiple teams need to agree on data formats
- You want to prevent bad data from entering the system
- You need to evolve schemas over time safely
- You want automatic documentation

## For Your Hackathon Submission

**Just focus on:**
1. ✅ Streaming real-time data to Confluent
2. ✅ Using Vertex AI to analyze the streams
3. ✅ Demonstrating the value of real-time AI

**Don't worry about:**
- ❌ Schema Registry
- ❌ Data contracts
- ❌ Schema validation

Your JSON streaming will work great as-is! 🚀

